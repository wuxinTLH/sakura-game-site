USE sakura_game_site;
INSERT INTO s_g_games (
        name,
        description,
        image_url,
        game_type,
        tags,
        author,
        sort_order,
        game_code
    )
VALUES (
        '俄罗斯方块',
        '经典的方块消除游戏！控制下落的方块，将它们排列成完整的行来消除。随着等级提升，方块下落速度越来越快，考验你的反应能力！',
        '',
        'html',
        '益智,经典,休闲',
        'Sakura',
        85,
        '<!DOCTYPE html><html><head><title>俄罗斯方块</title></head><body style="background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>🧱 俄罗斯方块</h1></body></html>'
    ),
    (
        '扫雷',
        '经典扫雷游戏！根据数字提示，找出所有隐藏的地雷。左键点击翻开格子，右键标记地雷，在不触雷的情况下翻开所有安全格子即可获胜！',
        '',
        'html',
        '益智,策略,经典',
        'Sakura',
        80,
        '<!DOCTYPE html><html><head><title>扫雷</title></head><body style="background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>💣 扫雷</h1></body></html>'
    ),
    (
        '打砖块',
        '控制挡板弹射小球，击碎所有砖块！小球碰到底部即失去一条命，消灭全部砖块即可通关。速度随关卡提升，越来越刺激！',
        '',
        'html',
        '动作,休闲,经典',
        'Sakura',
        75,
        '<!DOCTYPE html><html><head><title>打砖块</title></head><body style="background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>🧱 打砖块</h1></body></html>'
    ),
    (
        '记忆翻牌',
        '考验记忆力的翻牌配对游戏！翻开两张相同的卡片即可消除，在最短时间内完成全部配对。支持多种难度，适合所有年龄段的玩家！',
        '',
        'html',
        '益智,休闲,记忆',
        'Sakura',
        70,
        '<!DOCTYPE html><html><head><title>记忆翻牌</title></head><body style="background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>🃏 记忆翻牌</h1></body></html>'
    ),
    (
        '飞翔的鸟',
        '点击屏幕让小鸟飞翔，穿越一道道管道障碍！小鸟会不断下坠，需要持续点击维持高度。看你能穿越多少根管道，挑战你的最高分！',
        '',
        'html',
        '动作,休闲,挑战',
        'Sakura',
        65,
        '<!DOCTYPE html><html><head><title>飞翔的鸟</title></head><body style="background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>🐦 飞翔的鸟</h1></body></html>'
    ),
    (
        '数独',
        '经典数字逻辑游戏！在9×9的格子中填入1-9的数字，使每行、每列及每个3×3宫格内的数字均不重复。提供简单、中等、困难三种难度！',
        '',
        'html',
        '益智,策略,数字',
        'Sakura',
        60,
        '<!DOCTYPE html><html><head><title>数独</title></head><body style="background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>🔢 数独</h1></body></html>'
    ),
    (
        '打地鼠',
        '地鼠从洞里钻出来，快用锤子打它！在限定时间内尽可能多地打中地鼠得分，小心别打到炸弹！反应速度和准确性都至关重要！',
        '',
        'html',
        '动作,休闲,反应',
        'Sakura',
        55,
        '<!DOCTYPE html><html><head><title>打地鼠</title></head><body style="background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>🔨 打地鼠</h1></body></html>'
    ),
    (
        '华容道',
        '中国经典滑块益智游戏！移动方块让曹操从出口逃脱，看似简单，实则需要缜密的逻辑推理。提供多种经典布局，挑战你的空间思维！',
        '',
        'html',
        '益智,策略,中国经典',
        'Sakura',
        50,
        '<!DOCTYPE html><html><head><title>华容道</title></head><body style="background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>♟️ 华容道</h1></body></html>'
    );
SELECT id,
    name,
    tags,
    sort_order
FROM s_g_games
ORDER BY sort_order DESC;