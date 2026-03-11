// src/stores/localGames.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface LocalGame {
    id: string
    name: string
    description: string
    tags: string
    author: string
    code: string
    createdAt: string
    updatedAt: string
}

const STORAGE_KEY = 'sakura_local_games'

function loadFromStorage(): LocalGame[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function saveToStorage(list: LocalGame[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export const useLocalGamesStore = defineStore('localGames', () => {
    const list = ref<LocalGame[]>(loadFromStorage())

    const count = computed(() => list.value.length)

    function save(game: Omit<LocalGame, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
        const now = new Date().toISOString()
        if (game.id) {
            // 更新
            const idx = list.value.findIndex(g => g.id === game.id)
            if (idx !== -1) {
                list.value[idx] = { ...list.value[idx], ...game, updatedAt: now } as LocalGame
            }
        } else {
            // 新增
            const newGame: LocalGame = {
                ...game,
                id: `local_${Date.now()}`,
                createdAt: now,
                updatedAt: now,
            }
            list.value.unshift(newGame)
        }
        saveToStorage(list.value)
    }

    function remove(id: string) {
        list.value = list.value.filter(g => g.id !== id)
        saveToStorage(list.value)
    }

    function getById(id: string): LocalGame | undefined {
        return list.value.find(g => g.id === id)
    }

    function exportGame(id: string) {
        const game = getById(id)
        if (!game) return
        const blob = new Blob([game.code], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${game.name}.html`
        a.click()
        URL.revokeObjectURL(url)
    }

    return { list, count, save, remove, getById, exportGame }
})