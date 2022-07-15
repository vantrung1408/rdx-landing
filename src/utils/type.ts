export interface FormItem {
  value: any
  valid: boolean
  title: string
}

export interface TokenInput {
  value: string
  valid: boolean
}

export interface FormProps {
  tokenA: TokenInput
  tokenB: TokenInput
  title: string
}

export interface Token {
  address?: string
  name: string
  logo?: string
}

export interface TokenSelectorState {
  show: boolean
  exclude?: string[]
  callback?: (token: Token) => any
  cancelCallback?: () => any
}
