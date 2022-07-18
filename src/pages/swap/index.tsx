import React, { useEffect } from 'react'
import plusIcon from '../../img/plus.png'
import { AmountInput, AmountInputOnChangeProps, Button } from '../../components'
import { constants, ethers } from 'ethers'
import './index.css'
import { WalletStatus } from '../../components/wallet-status'
import {
  decimalsCorrector,
  getPairAddress,
  getRouter,
  getTokenContract,
  requestSigner,
} from '../../utils/wallet'
import { ROUTERV2, ERC20_ABI, PAIR_ABI } from '../../contracts'
import { toast } from 'react-toastify'
import { Token, TokenSelectorState } from '../../utils/type'
import { BigNumber } from 'bignumber.js'
import { ROUNDED_NUMBER } from '../../utils/constant'
import { sleep } from '../../utils/utillities'

export interface SwapProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setTokenSelector: React.Dispatch<React.SetStateAction<TokenSelectorState>>
}

export interface SwapFormProps {
  tokenA: AmountInputOnChangeProps
  tokenB: AmountInputOnChangeProps
}

export const Swap = (props: SwapProps) => {
  const initialForm = {
    tokenA: {
      valid: false,
      insufficient: false,
    },
    tokenB: {
      valid: false,
      insufficient: false,
    },
  }
  const [info, setInfo] = React.useState({
    tokenA: {
      balance: new BigNumber(0),
      decimals: new BigNumber(0),
      needApprove: false,
    },
    tokenB: {
      balance: new BigNumber(0),
      decimals: new BigNumber(0),
      needApprove: false,
    },
  })
  const [ratio, setRatio] = React.useState({
    tokenA: new BigNumber(1),
    tokenB: new BigNumber(1),
  })
  const [poolHasDeposited, setPoolHasDeposited] = React.useState(false)
  const [form, setForm] = React.useState<SwapFormProps>({ ...initialForm })
  const [pair, setPair] = React.useState<{
    tokenA: Token
    tokenB: Token
  }>({
    tokenA: { name: '' },
    tokenB: { name: '' },
  })
  const [ratioSwitcher, setRatioSwitcher] = React.useState(true)
  const [swapFunction, setSwapFunction] = React.useState<
    'swapExactTokensForTokens' | 'swapTokensForExactTokens'
  >('swapExactTokensForTokens')

  useEffect(() => {
    onPairChanged()
  }, [pair.tokenA.address, pair.tokenB.address])

  const onPairChanged = async () => {
    try {
      props.setLoading(true)
      if (!pair.tokenA.address || !pair.tokenB.address) {
        return
      }
      const address = await getPairAddress(
        pair.tokenA.address,
        pair.tokenB.address
      )
      const signer = await requestSigner()
      const lp = new ethers.Contract(address, PAIR_ABI, signer)
      const totalSupply = await lp.totalSupply()
      setPoolHasDeposited(totalSupply.gt(0))
    } catch {
    } finally {
      props.setLoading(false)
    }
  }

  const onTokenChange = async (slot: keyof typeof pair, value: Token) => {
    try {
      props.setLoading(true)
      if (!value.address) {
        return
      }
      if (value.address === constants.AddressZero) {
        setInfo({
          ...info,
          [slot]: {
            ...info[slot],
            balance: new BigNumber(0),
            decimals: new BigNumber(0),
            needApprove: false,
          },
        })
      } else {
        const signer = await requestSigner()
        const address = await signer.getAddress()
        const contract = await getTokenContract(value.address)
        const [balance, decimals, allowance] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals(),
          contract.allowance(address, ROUTERV2.address),
        ])
        setInfo({
          ...info,
          [slot]: {
            ...info[slot],
            balance: new BigNumber(balance.toString()),
            decimals: new BigNumber(decimals.toString()),
            needApprove: allowance.lt(balance),
          },
        })
      }
      setPair({
        ...pair,
        [slot]: { ...value },
      })
    } catch {
    } finally {
      props.setLoading(false)
    }
  }

  const onChangeAmountB = async (
    onChangeProps: AmountInputOnChangeProps,
    isUserTrigger: boolean
  ) => {
    if (!isUserTrigger) {
      return
    }

    const { value } = onChangeProps
    if (
      poolHasDeposited &&
      value &&
      pair.tokenA.address &&
      pair.tokenB.address
    ) {
      try {
        props.setLoading(true)
        const router = await getRouter()
        const parsedValue = decimalsCorrector(value, info.tokenB.decimals)
        const [amountIn] = await router.getAmountsIn(parsedValue.toString(), [
          pair.tokenA.address,
          pair.tokenB.address,
        ])
        form.tokenA.value = new BigNumber(amountIn.toString())
          .div(new BigNumber(10).pow(info.tokenA.decimals))
          .decimalPlaces(ROUNDED_NUMBER)
          .toNumber()
        setRatio({
          tokenA: new BigNumber(form.tokenA.value).div(value),
          tokenB: new BigNumber(1),
        })
        setSwapFunction('swapTokensForExactTokens')
      } catch {
        form.tokenA.value = undefined
      } finally {
        props.setLoading(false)
      }
    } else {
      form.tokenA.value = undefined
    }
    form.tokenB = onChangeProps
    setForm({
      ...form,
    })
  }

  const onChangeAmountA = async (
    onChangeProps: AmountInputOnChangeProps,
    isUserTrigger: boolean
  ) => {
    if (!isUserTrigger) {
      return
    }

    const { value } = onChangeProps
    if (
      poolHasDeposited &&
      value &&
      pair.tokenA.address &&
      pair.tokenB.address
    ) {
      try {
        props.setLoading(true)
        const router = await getRouter()
        const parsedValue = decimalsCorrector(value, info.tokenA.decimals)
        const [, amountOut] = await router.getAmountsOut(
          parsedValue.toString(),
          [pair.tokenA.address, pair.tokenB.address]
        )
        form.tokenB.value = new BigNumber(amountOut.toString())
          .div(new BigNumber(10).pow(info.tokenB.decimals))
          .decimalPlaces(ROUNDED_NUMBER)
          .toNumber()
        setRatio({
          tokenA: new BigNumber(1),
          tokenB: new BigNumber(form.tokenB.value).div(value),
        })
        setSwapFunction('swapExactTokensForTokens')
      } catch {
        form.tokenB.value = undefined
      } finally {
        props.setLoading(false)
      }
    } else {
      form.tokenB.value = undefined
    }
    form.tokenA = onChangeProps
    console.log(form.tokenA)
    setForm({
      ...form,
    })
  }

  const approve = async (slot: keyof typeof pair) => {
    try {
      props.setLoading(true)
      const token = pair[slot]
      if (!token || !token.address) {
        return
      }
      const signer = await requestSigner()
      const tokenContract = new ethers.Contract(
        token.address,
        ERC20_ABI,
        signer
      )
      const tx = await tokenContract.approve(
        ROUTERV2.address,
        constants.MaxUint256.toString()
      )
      await tx.wait()
      await onTokenChange(slot, token)
      toast.success('Success, approved')
    } catch {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
    }
  }

  const swap = async () => {
    try {
      if (!form.tokenA.valid || !form.tokenA.value || !form.tokenB.value) {
        return
      }
      props.setLoading(true)
      const amountA = decimalsCorrector(form.tokenA.value, info.tokenA.decimals)
      const amountB = decimalsCorrector(form.tokenB.value, info.tokenB.decimals)
      const signer = await requestSigner()
      const address = await signer.getAddress()
      const router = await getRouter()
      if (swapFunction === 'swapExactTokensForTokens') {
        const tx = await router.swapExactTokensForTokens(
          amountA.toString(),
          amountB.multipliedBy(0.95).decimalPlaces(0).toString(),
          [pair.tokenA.address, pair.tokenB.address],
          address,
          constants.MaxUint256
        )
        await tx.wait()
      } else {
        const tx = await router.swapTokensForExactTokens(
          amountA.toString(),
          amountB.multipliedBy(1.05).decimalPlaces(0).toString(),
          [pair.tokenA.address, pair.tokenB.address],
          address,
          constants.MaxUint256
        )
        await tx.wait()
      }
      await onTokenChange('tokenA', pair.tokenA)
      await onTokenChange('tokenB', pair.tokenB)
      toast.success(
        `Success, you supply ${form.tokenA.value} ${pair.tokenA.name}, ${form.tokenB.value} ${pair.tokenB.name} into the pool`
      )
    } catch (error) {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      setForm({ ...initialForm })
    }
  }

  const onTokenClick = (
    exclude: string[],
    slot: Exclude<keyof typeof pair, 'tokenLp'>
  ) => {
    props.setTokenSelector({
      show: true,
      callback: async (token) => {
        props.setTokenSelector({
          show: false,
          exclude: [],
        })
        await onTokenChange(slot, token)
        setForm({ ...initialForm })
      },
      cancelCallback: () => {
        props.setTokenSelector({
          show: false,
          exclude: [],
        })
      },
      exclude: exclude,
    })
  }

  const revertPair = async () => {
    setPair({
      tokenA: pair.tokenB,
      tokenB: pair.tokenA,
    })
    setInfo({
      tokenA: info.tokenB,
      tokenB: info.tokenA,
    })
  }

  const renderRatio = () => {
    if (!pair.tokenA || !pair.tokenB) {
      return
    }
    const tokenA = ratioSwitcher ? ratio.tokenA : ratio.tokenB
    const tokenALabel = ratioSwitcher ? pair.tokenA.name : pair.tokenB.name
    const tokenB = ratioSwitcher ? ratio.tokenB : ratio.tokenA
    const tokenBLabel = ratioSwitcher ? pair.tokenB.name : pair.tokenA.name
    return (
      <label
        className='rate-info'
        onClick={() => {
          setRatioSwitcher(!ratioSwitcher)
        }}
      >
        <label className='number'>
          {!tokenA || new BigNumber(tokenA).eq(0) ? '-' : '1'}
        </label>{' '}
        {tokenALabel} ={' '}
        <label className='number'>
          {!tokenA || new BigNumber(tokenA).eq(0)
            ? '-'
            : tokenB.div(tokenA).decimalPlaces(ROUNDED_NUMBER).toString()}
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
            onTokenClick={(token) => {
              onTokenClick(pair.tokenB ? [pair.tokenB.name] : [], 'tokenA')
            }}
            balance={info.tokenA.balance}
            decimals={info.tokenA.decimals}
            token={pair.tokenA}
            value={form.tokenA.value || ''}
            placeholder='0.0'
            onChange={onChangeAmountA}
            style={{ marginBottom: 0 }}
            showBalanceInfo
          />
          <div onClick={revertPair} className='arrow-icon'></div>
        </div>
        <AmountInput
          onTokenClick={(token) => {
            onTokenClick(pair.tokenA ? [pair.tokenA.name] : [], 'tokenB')
          }}
          balance={info.tokenB.balance}
          decimals={info.tokenB.decimals}
          token={pair.tokenB}
          value={form.tokenB.value || ''}
          placeholder='0.0'
          onChange={onChangeAmountB}
          showBalanceInfo
        />
        {poolHasDeposited && form.tokenA.value && form.tokenA.value && (
          <div className='rate-container'>
            <label className='rate-info'>Rate</label>
            {renderRatio()}
          </div>
        )}
        {info.tokenA.needApprove && pair.tokenA.name && (
          <Button
            type='button'
            value={`Approve ${pair.tokenA.name}`}
            onClick={async () => {
              approve('tokenA')
            }}
          />
        )}
        {info.tokenB.needApprove && pair.tokenB.name && (
          <Button
            type='button'
            value={`Approve ${pair.tokenB.name}`}
            onClick={async () => {
              approve('tokenB')
            }}
          />
        )}
        <Button
          type='button'
          value={
            form.tokenA.insufficient
              ? `Insufficient ${pair.tokenA.name} balance`
              : 'Swap'
          }
          onClick={swap}
          disabled={!form.tokenA.valid}
        />
      </div>
    </div>
  )
}
