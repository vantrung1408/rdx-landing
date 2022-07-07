import React from 'react'
import ethIcon from '../../img/eth.png'
import usdcIcon from '../../img/usdc.png'
import plusIcon from '../../img/plus.png'
import { AmountInput, Button, Tab, Tabs } from '../../components'
import { constants, ethers } from 'ethers'
import './index.css'
import { WalletStatus } from '../../components/wallet-status'
import {
  decimalsCorrector,
  getAccount,
  requestSigner,
  switchToCorrectNetwork,
} from '../../utils/wallet'
import { LP, WETH, USDC } from '../../contracts'
import { toast } from 'react-toastify'
import { FormProps } from '../../utils/type'
import { BigNumber } from 'bignumber.js'
import { ROUNDED_NUMBER } from '../../utils/constant'

export interface PoolProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export const Pool = (props: PoolProps) => {
  const [info, setInfo] = React.useState({
    tokenA: new BigNumber(0),
    tokenB: new BigNumber(0),
    tokenADecimals: new BigNumber(0),
    tokenBDecimals: new BigNumber(0),
    needApproveTokenA: false,
    needApproveTokenB: false,
    pool: {
      tokenA: new BigNumber(0),
      tokenB: new BigNumber(0),
    },
    ratio: {
      tokenA: 1,
      tokenB: 1,
    },
  })
  const [form, setForm] = React.useState({
    add: {
      tokenA: {
        value: '',
        valid: false,
      },
      tokenB: {
        value: '',
        valid: false,
      },
      title: 'Supply',
    } as FormProps,
    remove: {
      tokenA: {
        value: '',
        valid: false,
      },
      tokenB: {
        value: '',
        valid: false,
      },
      title: 'Withdraw',
    } as FormProps,
  })
  const pairs = [
    {
      tokenA: {
        name: 'WETH',
        logo: ethIcon,
        contract: async () => {
          const signer = await requestSigner()
          const tokenA = new ethers.Contract(WETH.address, WETH.abi, signer)
          return tokenA
        },
      },
      tokenB: {
        name: 'USDC',
        logo: usdcIcon,
        contract: async () => {
          const signer = await requestSigner()
          const tokenB = new ethers.Contract(USDC.address, USDC.abi, signer)
          return tokenB
        },
      },
    },
  ]
  const [selected, setSelected] = React.useState(0)
  const [pair, setPair] = React.useState(pairs[selected])
  const [ratioSwitcher, setRatioSwitcher] = React.useState(true)

  React.useEffect(() => {
    initState()
  }, [])

  const initState = async () => {
    const connected = await getAccount()
    if (!!connected) {
      await loadInfo(true)
    }
    const handler = () => {
      loadInfo(false)
    }
    window.ethereum.removeListener('accountsChanged', handler)
    window.ethereum.removeListener('chainChanged', handler)
    window.ethereum.on('accountsChanged', handler)
    window.ethereum.on('chainChanged', handler)
  }

  const getLP = async () => {
    const signer = await requestSigner()
    const lp = new ethers.Contract(LP.address, LP.abi, signer)
    return lp
  }

  const loadInfo = async (forceSwitchNetwork: boolean = false) => {
    try {
      props.setLoading(true)
      if (forceSwitchNetwork) {
        await switchToCorrectNetwork()
      }

      const signer = await requestSigner()
      const address = await signer.getAddress()
      const [lp, tokenA, tokenB] = await Promise.all([
        getLP(),
        pair.tokenA.contract(),
        pair.tokenB.contract(),
      ])
      // get tokenA balance
      const [
        tokenADecimals,
        tokenABalance,
        tokenAAllowance,
        tokenBDecimals,
        tokenBBalance,
        tokenBAllowance,
      ] = await Promise.all([
        tokenA.decimals(),
        tokenA.balanceOf(address),
        tokenA.allowance(address, lp.address),
        tokenB.decimals(),
        tokenB.balanceOf(address),
        tokenB.allowance(address, lp.address),
      ])
      const ratio: BigNumber[] = await lp.prepareAmount(1, await lp.amountB())
      const pool: BigNumber[] = await lp.getUserCurrentBalance()
      // const pool: BigNumber[] = [BigNumber.from(0), BigNumber.from(0)]
      setInfo({
        tokenA: new BigNumber(tokenABalance.toString()),
        tokenB: new BigNumber(tokenBBalance.toString()),
        tokenADecimals: new BigNumber(tokenADecimals.toString()),
        tokenBDecimals: new BigNumber(tokenBDecimals.toString()),
        needApproveTokenA: tokenAAllowance.lt(tokenABalance),
        needApproveTokenB: tokenBAllowance.lt(tokenBBalance),
        ratio: {
          tokenA: ratio[0].toNumber(),
          tokenB: ratio[1].toNumber(),
        },
        pool: {
          tokenA: new BigNumber(pool[0].toString()),
          tokenB: new BigNumber(pool[1].toString()),
        },
      })
    } catch {
      // toast.error('Failed to connect your wallet')
    } finally {
      props.setLoading(false)
    }
  }

  const onChangeAmountB = (
    title: string,
    formProps: FormProps,
    value: number | '',
    balanceA: BigNumber,
    balanceB: BigNumber
  ) => {
    const { tokenA, tokenB } = formProps
    if (value && info.ratio.tokenB) {
      tokenA.value = (
        (value * info.ratio.tokenA) /
        info.ratio.tokenB
      ).toString()
    } else {
      tokenA.value = ''
    }
    tokenB.value = value.toString()
    checkFormValidAndGenTitle(title, formProps, balanceA, balanceB)
    setForm({
      ...form,
    })
  }

  const onChangeAmountA = (
    title: string,
    formProps: FormProps,
    value: number | '',
    balanceA: BigNumber,
    balanceB: BigNumber
  ) => {
    const { tokenA, tokenB } = formProps
    if (value && info.ratio.tokenA) {
      tokenB.value = (
        (value * info.ratio.tokenB) /
        info.ratio.tokenA
      ).toString()
    } else {
      tokenB.value = ''
    }
    tokenA.value = value.toString()
    checkFormValidAndGenTitle(title, formProps, balanceA, balanceB)
    setForm({
      ...form,
    })
  }

  const checkFormValidAndGenTitle = (
    title: string,
    formProps: FormProps,
    balanceA: BigNumber,
    balanceB: BigNumber
  ) => {
    const { tokenA, tokenB } = formProps
    const data = [
      {
        ref: tokenA,
        value: tokenA.value,
        decimals: info.tokenADecimals,
        balance: balanceA,
        name: pair.tokenA.name,
      },
      {
        ref: tokenB,
        value: tokenB.value,
        decimals: info.tokenBDecimals,
        balance: balanceB,
        name: pair.tokenB.name,
      },
    ]
    try {
      for (let { ref, value, decimals, balance, name } of data) {
        const parsedValue = decimalsCorrector(value, decimals)
        ref.valid = !!value && balance.gte(parsedValue)
        formProps.title = balance.lt(parsedValue)
          ? `Insufficient ${name} balance`
          : title
        if (!ref.valid) {
          break
        }
      }
    } catch {
      tokenA.valid = false
      tokenB.valid = false
      formProps.title = title
    }
  }

  const approve = async (contract: ethers.Contract) => {
    try {
      props.setLoading(true)
      const lp = await getLP()
      const tx = await contract.approve(
        lp.address,
        constants.MaxUint256.toString()
      )
      await tx.wait()
      await loadInfo(false)
      toast.success('Success, approved')
    } catch {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
    }
  }

  const supply = async () => {
    try {
      if (!form.add.tokenA.valid || !form.add.tokenB.valid) {
        return
      }
      props.setLoading(true)
      const amountA = decimalsCorrector(
        form.add.tokenA.value,
        info.tokenADecimals
      )
      const amountB = decimalsCorrector(
        form.add.tokenB.value,
        info.tokenBDecimals
      )
      const lp = await getLP()
      const tx = await lp.add(amountA.toString(), amountB.toString())
      await tx.wait()
      await loadInfo()
      toast.success(
        `Success, you supply ${form.add.tokenA.value} ${pair.tokenA.name}, ${form.add.tokenB.value} ${pair.tokenB.name} into the pool`
      )
    } catch {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      onChangeAmountA('Supply', form.add, '', info.tokenA, info.tokenB)
    }
  }

  const withdraw = async () => {
    try {
      if (!form.remove.tokenA.valid || !form.remove.tokenB.valid) {
        return
      }
      props.setLoading(true)
      const amountA = decimalsCorrector(
        form.remove.tokenA.value,
        info.tokenADecimals
      )
      const amountB = decimalsCorrector(
        form.remove.tokenB.value,
        info.tokenBDecimals
      )
      const lp = await getLP()
      const tx = await lp.remove(amountA.toString(), amountB.toString())
      await tx.wait()
      await loadInfo()
      toast.success(
        `Success, you withdraw ${form.remove.tokenA.value} ${pair.tokenA.name}, ${form.remove.tokenB.value} ${pair.tokenB.name} from the pool`
      )
    } catch {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      onChangeAmountA(
        'Withdraw',
        form.remove,
        '',
        info.pool.tokenA,
        info.pool.tokenB
      )
    }
  }

  const renderRatio = () => {
    const tokenA = ratioSwitcher ? info.ratio.tokenA : info.ratio.tokenB
    const tokenALabel = ratioSwitcher ? pair.tokenA.name : pair.tokenB.name
    const tokenB = ratioSwitcher ? info.ratio.tokenB : info.ratio.tokenA
    const tokenBLabel = ratioSwitcher ? pair.tokenB.name : pair.tokenA.name
    return (
      <label
        className='rate-info'
        onClick={() => {
          setRatioSwitcher(!ratioSwitcher)
        }}
      >
        <label className='number'>
          {!tokenA || new BigNumber(tokenA).eq(0)
            ? '-'
            : new BigNumber(tokenA).div(tokenA).toFixed(ROUNDED_NUMBER)}
        </label>{' '}
        {tokenALabel} ={' '}
        <label className='number'>
          {!tokenA || new BigNumber(tokenA).eq(0)
            ? '-'
            : new BigNumber(tokenB).div(tokenA).toFixed(ROUNDED_NUMBER)}
        </label>{' '}
        {tokenBLabel}
      </label>
    )
  }

  const tabs: Tab[] = [
    {
      title: 'Add',
      child: (
        <div className='form-content-container'>
          <WalletStatus callback={async () => {}} />
          <div className='pool-amount-input'>
            <AmountInput
              balance={info.tokenA}
              decimals={info.tokenADecimals}
              token={{
                name: pair.tokenA.name,
                logo: pair.tokenA.logo,
              }}
              value={form.add.tokenA.value}
              placeholder='0.0'
              onChange={(value) => {
                onChangeAmountA(
                  'Supply',
                  form.add,
                  value,
                  info.tokenA,
                  info.tokenB
                )
              }}
              style={{ marginBottom: 0 }}
              showBalanceInfo
            />
            <img className='plus-icon' src={plusIcon} />
          </div>
          <AmountInput
            balance={info.tokenB}
            decimals={info.tokenBDecimals}
            token={{
              name: pair.tokenB.name,
              logo: pair.tokenB.logo,
            }}
            value={form.add.tokenB.value}
            placeholder='0.0'
            onChange={(value) => {
              onChangeAmountB(
                'Supply',
                form.add,
                value,
                info.tokenA,
                info.tokenB
              )
            }}
            showBalanceInfo
          />
          {info.ratio.tokenA && info.ratio.tokenB && (
            <div className='rate-container'>
              <label className='rate-info'>Rate</label>
              {renderRatio()}
            </div>
          )}
          {info.needApproveTokenA && (
            <Button
              type='button'
              value={`Approve ${pair.tokenA.name}`}
              onClick={async () => {
                approve(await pair.tokenA.contract())
              }}
            />
          )}
          {info.needApproveTokenB && (
            <Button
              type='button'
              value={`Approve ${pair.tokenB.name}`}
              onClick={async () => {
                approve(await pair.tokenB.contract())
              }}
            />
          )}
          <Button
            type='button'
            value={form.add.title}
            onClick={supply}
            disabled={!form.add.tokenA.valid || !form.add.tokenB.valid}
          />
        </div>
      ),
    },
    {
      title: 'Remove',
      child: (
        <div className='form-content-container'>
          <WalletStatus callback={async () => {}} />
          <div className='pool-amount-input'>
            <AmountInput
              balance={info.pool.tokenA}
              decimals={info.tokenADecimals}
              token={{
                name: pair.tokenA.name,
                logo: pair.tokenA.logo,
              }}
              value={form.remove.tokenA.value}
              placeholder='0.0'
              balanceInfoTitle='Pooled'
              onChange={(value) => {
                onChangeAmountA(
                  'Withdraw',
                  form.remove,
                  value,
                  info.pool.tokenA,
                  info.pool.tokenB
                )
              }}
              style={{ marginBottom: 0 }}
              showBalanceInfo
            />
            <img className='plus-icon' src={plusIcon} />
          </div>
          <AmountInput
            balance={info.pool.tokenB}
            decimals={info.tokenBDecimals}
            token={{
              name: pair.tokenB.name,
              logo: pair.tokenB.logo,
            }}
            value={form.remove.tokenB.value}
            placeholder='0.0'
            balanceInfoTitle='Pooled'
            onChange={(value) => {
              onChangeAmountB(
                'Withdraw',
                form.remove,
                value,
                info.pool.tokenA,
                info.pool.tokenB
              )
            }}
            showBalanceInfo
          />
          {info.ratio.tokenA && info.ratio.tokenB && (
            <div className='rate-container'>
              <label className='rate-info'>Rate</label>
              {renderRatio()}
            </div>
          )}
          <Button
            type='button'
            value={form.remove.title}
            onClick={withdraw}
            disabled={!form.remove.tokenA.valid || !form.remove.tokenB.valid}
          />
        </div>
      ),
    },
  ]

  return (
    <div className='pool form-container'>
      <Tabs tabs={tabs} />
    </div>
  )
}
