/**
 * 创建活动页相关常量。
 */

/** 最近一次选中的小队缓存键（按用户隔离，避免切换账号后误回填） */
export const ACTIVITY_SELECTED_SQUAD_KEY = 'hiGoActivitySelectedSquad'

/** 创建小队成功后待回填的临时小队缓存键（由创建小队页写入，创建活动页消费后清除） */
export const PENDING_SQUAD_SELECTION_KEY = 'hiGoPendingSquadSelection'
