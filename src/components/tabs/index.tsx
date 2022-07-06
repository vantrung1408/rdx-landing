import React from 'react'
import './index.css'

export interface Tab {
  title: string
  child: JSX.Element
}

export interface TabsProps {
  tabs: Tab[]
  onTabChange?: (index: number) => any
}

export const Tabs = function ({ tabs, onTabChange }: TabsProps) {
  const [selected, setSelected] = React.useState(0)

  if (!tabs.length) {
    return <></>
  }

  return (
    <div className='tabs-container'>
      <div className='tabs-content'>{tabs[selected].child}</div>
      <div className='tabs-title'>
        <div className='routes-container'>
          <div className='routes'>
            {tabs.map(({ title }, index) => (
              <a
                onClick={() => {
                  setSelected(index)
                  onTabChange && onTabChange(index)
                }}
                key={index}
                className={index === selected ? 'route active' : 'route'}
                href='#'
              >
                {title}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
