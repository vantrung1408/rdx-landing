import React from 'react'
import ethIcon from '../../img/eth.png'
import usdcIcon from '../../img/usdc.png'
import { AmountInput, Button } from '../../components'
import { constants, ethers } from 'ethers'
import { BigNumber } from 'bignumber.js'
import './index.css'
import { WalletStatus } from '../../components/wallet-status'
import { FormProps } from '../../utils/type'
import {
  decimalsCorrector,
  getAccount,
  requestSigner,
  switchToCorrectNetwork,
} from '../../utils/wallet'
import { LP, USDC, WETH } from '../../contracts'
import { toast } from 'react-toastify'
import { ROUNDED_NUMBER } from '../../utils/constant'

export interface SwapProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export const Swap = (props: SwapProps) => {
  const [info, setInfo] = React.useState({
    tokenA: new BigNumber(0),
    tokenB: new BigNumber(0),
    tokenADecimals: new BigNumber(0),
    tokenBDecimals: new BigNumber(0),
    needApproveTokenA: false,
    needApproveTokenB: false,
    amountA: new BigNumber(0),
    amountB: new BigNumber(0),
    k: new BigNumber(0),
  })
  const [form, setForm] = React.useState<FormProps>({
    tokenA: {
      value: '',
      valid: false,
    },
    tokenB: {
      value: '',
      valid: false,
    },
    title: 'Swap',
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
  const [pairSwitcher, setPairSwitcher] = React.useState(true)

  React.useEffect(() => {
    initState()
  }, [])

  React.useEffect(() => {
    loadInfo(false)
  }, [pair])

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
        amountA,
        amountB,
        k,
      ] = await Promise.all([
        tokenA.decimals(),
        tokenA.balanceOf(address),
        tokenA.allowance(address, lp.address),
        tokenB.decimals(),
        tokenB.balanceOf(address),
        tokenB.allowance(address, lp.address),
        pairSwitcher ? lp.amountA() : lp.amountB(),
        pairSwitcher ? lp.amountB() : lp.amountA(),
        lp.k(),
      ])
      // const pool: BigNumber[] = [BigNumber.from(0), BigNumber.from(0)]
      setInfo({
        tokenA: new BigNumber(tokenABalance.toString()),
        tokenB: new BigNumber(tokenBBalance.toString()),
        tokenADecimals: new BigNumber(tokenADecimals.toString()),
        tokenBDecimals: new BigNumber(tokenBDecimals.toString()),
        needApproveTokenA: tokenAAllowance.lt(tokenABalance),
        needApproveTokenB: tokenBAllowance.lt(tokenBBalance),
        amountA: new BigNumber(amountA.toString()),
        amountB: new BigNumber(amountB.toString()),
        k: new BigNumber(k.toString()),
      })
    } catch {
      // toast.error('Failed to connect your wallet')
    } finally {
      props.setLoading(false)
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

  const onChangeAmountA = (value: number | '') => {
    let title: string = 'Swap'
    if (value) {
      const parsedValue = decimalsCorrector(value, info.tokenADecimals)
      const valueB = calculateSwapInfo(parsedValue, info.amountA, info.amountB)
      form.tokenA.valid = parsedValue.gt(0) && parsedValue.lte(info.tokenA)
      form.tokenB.value = valueB
        .div(new BigNumber(10).pow(info.tokenADecimals))
        .toFixed(ROUNDED_NUMBER)
      if (parsedValue.gt(info.tokenA)) {
        title = `Insufficient ${pair.tokenA.name} balance`
      }
    } else {
      form.tokenA.valid = false
      form.tokenB.value = ''
    }
    form.title = title
    form.tokenA.value = value.toString()
    setForm({
      ...form,
    })
  }

  const onChangeAmountB = (value: number | '') => {
    if (value) {
      const parsedValue = decimalsCorrector(value, info.tokenBDecimals)
      const valueA = calculateSwapInfo(parsedValue, info.amountB, info.amountA)
      form.tokenA.value = valueA
        .div(new BigNumber(10).pow(info.tokenBDecimals))
        .toFixed(ROUNDED_NUMBER)
    } else {
      form.tokenA.value = ''
    }
    form.tokenB.valid = true
    form.tokenB.value = value.toString()
    setForm({
      ...form,
    })
  }

  const calculateSwapInfo = (
    value: BigNumber.Value,
    x: BigNumber.Value,
    y: BigNumber.Value
  ) => {
    const parsedValue = new BigNumber(value)
    const parsedX = new BigNumber(x)
    const parsedY = new BigNumber(y)
    if (parsedValue.eq(0) || parsedX.eq(0)) {
      return new BigNumber(0)
    }
    const needed = parsedY.minus(info.k.div(parsedX.plus(parsedValue)))
    return needed
  }

  const swap = async () => {
    try {
      if (!form.tokenA.valid) {
        return
      }
      props.setLoading(true)
      const amount = decimalsCorrector(form.tokenA.value, info.tokenADecimals)
      const minAmountOut = calculateSwapInfo(amount, info.amountA, info.amountB)
        .multipliedBy(0.95) // slippage 0.5%
        .toFixed(0)
      const lp = await getLP()
      const tokenA = await pair.tokenA.contract()
      const tokenB = await pair.tokenB.contract()
      const tx = await lp.swap(
        tokenA.address,
        tokenB.address,
        amount.toString(),
        minAmountOut.toString()
      )
      await tx.wait()
      toast.success(
        `Success, you swap from ${form.tokenA.value} ${pair.tokenA.name} to ${form.tokenB.value} ${pair.tokenB.name}`
      )
    } catch {
      toast.error(
        'Failed, please try again later or try refresh this page to fetch newest price!'
      )
    } finally {
      props.setLoading(false)
      onChangeAmountA('')
      await loadInfo()
    }
  }

  const revertPair = () => {
    onChangeAmountA('')
    setPair({
      tokenA: pair.tokenB,
      tokenB: pair.tokenA,
    })
    setPairSwitcher(!pairSwitcher)
  }

  const renderRatio = () => {
    const tokenA = ratioSwitcher ? form.tokenA.value : form.tokenB.value
    const tokenALabel = ratioSwitcher ? pair.tokenA.name : pair.tokenB.name
    const tokenB = ratioSwitcher ? form.tokenB.value : form.tokenA.value
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
        {tokenALabel} ={' ~'}
        <label className='number'>
          {!tokenA || new BigNumber(tokenA).eq(0)
            ? '-'
            : new BigNumber(tokenB).div(tokenA).toFixed(ROUNDED_NUMBER)}
        </label>{' '}
        {tokenBLabel}
      </label>
    )
  }

  return (
    <div className='pool form-container'>
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
            value={form.tokenA.value}
            placeholder='0.0'
            onChange={(value) => {
              onChangeAmountA(value)
            }}
            style={{ marginBottom: 0 }}
            showBalanceInfo
          />
          <div onClick={revertPair} className='arrow-icon'></div>
        </div>
        <AmountInput
          balance={info.tokenB}
          decimals={info.tokenBDecimals}
          token={{
            name: pair.tokenB.name,
            logo: pair.tokenB.logo,
          }}
          value={form.tokenB.value}
          placeholder='0.0'
          onChange={(value) => {
            onChangeAmountB(value)
          }}
          showBalanceInfo
        />
        {form.tokenA.value && form.tokenB.value && (
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
          value={form.title}
          onClick={swap}
          disabled={!form.tokenA.valid}
        />
      </div>
    </div>
  )
}
