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