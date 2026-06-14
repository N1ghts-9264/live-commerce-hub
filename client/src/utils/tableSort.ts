export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: string
  direction: SortDirection
}

export function getValueByPath(row: Record<string, any>, path: string) {
  return path.split('.').reduce((current, part) => current?.[part], row)
}

function normalizeForSort(value: unknown) {
  if (value === null || value === undefined || value === '') return { empty: true, value: '' }
  if (typeof value === 'number') return { empty: false, value }

  const asNumber = Number(value)
  if (typeof value !== 'boolean' && String(value).trim() !== '' && Number.isFinite(asNumber)) {
    return { empty: false, value: asNumber }
  }

  const asDate = Date.parse(String(value))
  if (Number.isFinite(asDate) && /[-/:年月日T]/.test(String(value))) {
    return { empty: false, value: asDate }
  }

  return { empty: false, value: String(value).toLocaleLowerCase('zh-CN') }
}

export function sortRows<T extends Record<string, any>>(rows: T[], state: SortState | null) {
  if (!state) return rows
  const factor = state.direction === 'desc' ? -1 : 1

  return [...rows].sort((a, b) => {
    const av = normalizeForSort(getValueByPath(a, state.key))
    const bv = normalizeForSort(getValueByPath(b, state.key))

    if (av.empty && bv.empty) return 0
    if (av.empty) return 1
    if (bv.empty) return -1
    if (av.value > bv.value) return factor
    if (av.value < bv.value) return -factor
    return 0
  })
}
