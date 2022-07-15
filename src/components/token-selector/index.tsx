import React from 'react'
import { Token } from '../../utils/type'
import { Button } from '../button'
import { Input } from '../input'
import './index.css'

export interface TokenSelectorProps {
  tokens: Token[]
  exclude?: string[]
  callback?: (token: Token) => any
  cancelCallback?: () => any
}
export const TokenSelector = ({
  tokens,
  exclude,
  callback,
  cancelCallback,
}: TokenSelectorProps) => {
  const [items, setItems] = React.useState(
    exclude ? tokens.filter((token) => !exclude.includes(token.name)) : tokens
  )
  const [selected, setSelected] = React.useState(-1)

  const onSelectToken = (index: number) => {
    if (index === selected) {
      callback && callback(items[index])
    } else {
      setSelected(index)
    }
  }

  const onSearchChange = (event: any) => {
    let original = exclude
      ? tokens.filter((token) => !exclude.includes(token.name))
      : tokens
    if (event.target.value) {
      original = original.filter((token) =>
        token.name.toLowerCase().includes(event.target.value.toLowerCase())
      )
    }
    setItems(original)
  }

  return (
    <div className='token-selector-wrapper'>
      <div className='token-name-input'>
        <Input onChange={onSearchChange} placeholder={'enter token name...'} />
      </div>

      <div className='tokens-container'>
        {!items.length ? (
          <p className='no-matched'>no matched tokens</p>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className={`token-item-container ${
                index === selected ? 'active' : ''
              }`}
              onClick={() => {
                onSelectToken(index)
              }}
            >
              {item.logo && <img src={item.logo} className='token-item-logo' />}
              <label className='token-item-name'>{item.name}</label>
            </div>
          ))
        )}
      </div>
      <Button
        type='button'
        value='Cancel'
        onClick={() => {
          cancelCallback && cancelCallback()
        }}
      />
    </div>
  )
}
