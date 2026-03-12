// src/composables/useCodeMirror.ts
import { ref, onMounted, onUnmounted } from 'vue'
import {
    EditorView, keymap, lineNumbers, highlightActiveLineGutter,
    highlightSpecialChars, drawSelection, dropCursor,
    rectangularSelection, crosshairCursor, highlightActiveLine,
} from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import {
    defaultKeymap, history, historyKeymap,
    undo, redo, undoDepth, redoDepth,
} from '@codemirror/commands'
import {
    indentOnInput, syntaxHighlighting, defaultHighlightStyle,
    bracketMatching, foldGutter, indentUnit,
} from '@codemirror/language'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { css } from '@codemirror/lang-css'
import { oneDark } from '@codemirror/theme-one-dark'

export type EditorTheme = 'dark' | 'light'
export type EditorLang = 'html' | 'javascript' | 'css'

const themeCompartment = new Compartment()
const langCompartment = new Compartment()

function getLangExtension(lang: EditorLang) {
    switch (lang) {
        case 'javascript': return javascript()
        case 'css': return css()
        default: return html()
    }
}

function getLightTheme() {
    return EditorView.theme({
        '&': {
            fontSize: '13px',
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            height: '100%',
            background: '#ffffff',
        },
        '.cm-content': { caretColor: '#333', padding: '12px 0' },
        '.cm-gutters': { background: '#f8f8f8', color: '#aaa', borderRight: '1px solid #e8e8e8' },
        '.cm-activeLineGutter': { background: '#fff3f6' },
        '.cm-activeLine': { background: '#fff3f6' },
        '.cm-selectionBackground, ::selection': { background: '#ffd6e7 !important' },
        '.cm-cursor': { borderLeftColor: '#c44d7b' },
        '.cm-foldPlaceholder': { background: '#ffd6e7', border: 'none', color: '#c44d7b' },
        '.cm-matchingBracket': { background: '#ffd6e7', outline: '1px solid #c44d7b' },
        '.cm-scroller': { overflow: 'auto' },
    }, { dark: false })
}

export function useCodeMirror(options: {
    initialValue?: string
    theme?: EditorTheme
    lang?: EditorLang
    onChange?: (value: string) => void
}) {
    const container = ref<HTMLElement>()
    let view: EditorView | null = null

    const canUndo = ref(false)
    const canRedo = ref(false)

    function updateHistory(v: EditorView) {
        canUndo.value = undoDepth(v.state) > 0
        canRedo.value = redoDepth(v.state) > 0
    }

    function buildState(value: string, theme: EditorTheme, lang: EditorLang) {
        return EditorState.create({
            doc: value,
            extensions: [
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightSpecialChars(),
                history(),
                foldGutter(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                indentOnInput(),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                bracketMatching(),
                rectangularSelection(),
                crosshairCursor(),
                highlightActiveLine(),
                indentUnit.of('  '),
                keymap.of([
                    ...defaultKeymap,
                    ...historyKeymap,
                ]),
                themeCompartment.of(theme === 'dark' ? oneDark : getLightTheme()),
                langCompartment.of(getLangExtension(lang)),
                EditorView.updateListener.of(update => {
                    if (update.docChanged) {
                        updateHistory(update.view)
                        options.onChange?.(update.state.doc.toString())
                    }
                }),
                EditorView.theme({
                    '&': { height: '100%' },
                    '.cm-scroller': {
                        overflow: 'auto',
                        fontFamily: "'Fira Code','Cascadia Code','Consolas',monospace",
                    },
                }),
            ],
        })
    }

    onMounted(() => {
        if (!container.value) return
        view = new EditorView({
            state: buildState(
                options.initialValue || '',
                options.theme || 'dark',
                options.lang || 'html',
            ),
            parent: container.value,
        })
        updateHistory(view)
    })

    onUnmounted(() => {
        view?.destroy()
        view = null
    })

    function setValue(value: string) {
        if (!view) return
        const current = view.state.doc.toString()
        if (current === value) return
        view.dispatch({
            changes: { from: 0, to: current.length, insert: value },
        })
    }

    function getValue(): string {
        return view?.state.doc.toString() ?? ''
    }

    function setTheme(theme: EditorTheme) {
        view?.dispatch({
            effects: themeCompartment.reconfigure(theme === 'dark' ? oneDark : getLightTheme()),
        })
    }

    function setLang(lang: EditorLang) {
        view?.dispatch({
            effects: langCompartment.reconfigure(getLangExtension(lang)),
        })
    }

    function doUndo() {
        if (!view) return
        undo(view)
        updateHistory(view)
        view.focus()
    }

    function doRedo() {
        if (!view) return
        redo(view)
        updateHistory(view)
        view.focus()
    }

    function focus() {
        view?.focus()
    }

    return { container, canUndo, canRedo, setValue, getValue, setTheme, setLang, doUndo, doRedo, focus }
}