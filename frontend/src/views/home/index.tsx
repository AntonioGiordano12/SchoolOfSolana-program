// Next, React
import { FC, useEffect, useState } from 'react';
import Link from 'next/link';

// Wallet
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';


// Components
import { RequestAirdrop } from '../../components/RequestAirdrop';
import pkg from '../../../package.json';

// Store
import useUserSOLBalanceStore from '../../stores/useUserSOLBalanceStore';

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export const HomeView: FC = ({ }) => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const balance = useUserSOLBalanceStore((s) => s.balance)
  const { getUserSOLBalance } = useUserSOLBalanceStore()

  useEffect(() => {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      getUserSOLBalance(wallet.publicKey, connection)
    }
  }, [wallet.publicKey, connection, getUserSOLBalance])

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className='mt-6'>
          <div className='text-sm font-normal align-bottom text-right text-slate-600 mt-4'>v{pkg.version}</div>
          <h1 className="text-center text-5xl md:pl-12 font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mb-4">
            Game of Life
          </h1>
        </div>
        <h4 className="md:w-full text-2xl md:text-4xl text-center text-slate-300 my-2">
          <p>Conway's Game of Life on Solana</p>
          <p className='text-slate-500 text-2xl leading-relaxed'>Create and share your own patterns on-chain!</p>
          <p className='text-slate-500 text-2xl leading-relaxed'>Go into the gallery to start</p>
          <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </h4>

        {!wallet.connected ? (
          <div className="flex flex-col items-center">
            <p className="text-center text-slate-300 mb-4">Connect your wallet to start playing</p>
            <WalletMultiButtonDynamic className="btn-ghost btn-sm relative flex md:hidden text-lg " />

          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Link href="/gallery" className="btn btn-secondary">View Gallery</Link>
            <div className="flex flex-row items-center gap-2 mb-4">
              <div className="text-slate-300">Balance:</div>
              <div>{(balance || 0).toLocaleString()}</div>
              <div className='text-slate-600'>SOL</div>
            </div>

            <div className="flex flex-col gap-4">
              <RequestAirdrop />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
