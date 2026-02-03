export enum BaseScopeType {
  GLOBAL = 'global',
  GROUP = 'group',
}

export type BaseScope = { type: BaseScopeType.GLOBAL } | { type: BaseScopeType.GROUP, groupId: number }