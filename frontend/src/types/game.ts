// src/types/game.ts

export interface Game {
    id: number
    name: string
    description: string
    image_url: string
    game_code?: string        // 仅详情页才携带
    game_type: 'html' | 'canvas'
    tags: string
    author: string
    play_count: number
    sort_order: number
    is_active: number
    created_at: string
    updated_at: string
}

export interface GameListItem extends Omit<Game, 'game_code'> { }

export interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

export interface GameListResponse {
    success: boolean
    data: {
        list: GameListItem[]
        pagination: Pagination
    }
}

export interface GameDetailResponse {
    success: boolean
    data: Game
}

export interface GameCreatePayload {
    name: string
    description?: string
    image_url?: string
    game_code: string
    game_type?: 'html' | 'canvas'
    tags?: string
    author?: string
    sort_order?: number
}