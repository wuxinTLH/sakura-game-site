// src/composables/useConfirm.ts
// 全局确认弹窗，替代原生 confirm()
// 用法：const { confirm } = useConfirm()
//       await confirm({ title:'删除游戏', body:'此操作不可撤销' })
import { ref, shallowRef } from 'vue'

interface ConfirmOptions {
    title: string
    body?: string
    okText?: string
    cancelText?: string
    danger?: boolean   // true 时确认按钮显示为红色
}

const visible = ref(false)
const options = ref<ConfirmOptions>({ title: '' })
let resolveFn: ((ok: boolean) => void) | null = null

export function useConfirm() {
    function confirm(opts: ConfirmOptions): Promise<boolean> {
        options.value = opts
        visible.value = true
        return new Promise(resolve => { resolveFn = resolve })
    }

    function _ok() {
        visible.value = false
        resolveFn?.(true)
        resolveFn = null
    }

    function _cancel() {
        visible.value = false
        resolveFn?.(false)
        resolveFn = null
    }

    return { confirm, visible, options, _ok, _cancel }
}