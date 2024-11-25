// TODO: SignMessage
import { verify } from '@noble/ed25519';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { FC, useCallback, useState } from 'react';
import { notify } from "../utils/notifications";

import { Program, AnchorProvider, web3, utils, BN, setProvider } from "@coral-xyz/anchor"
import idl from "./game_of_life_pda.json"
import { GameOfLifePda } from './game_of_life_pda';
import { PublicKey } from '@solana/web3.js';

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.address)

const FEED_SEED = "FEED_SEED";
const GAME_SEED = "GAME_SEED";

const GRID_SIZE = 64; // 64x64 grid
const CELL_SIZE = 10; // Smaller cell size for the larger grid

function serializeBitmap(aliveCells: Array<[number, number]>): Uint8Array {
    const bitmap = new Uint8Array((GRID_SIZE * GRID_SIZE) / 8);
    for (const [row, col] of aliveCells) {
        if (row >= GRID_SIZE || col >= GRID_SIZE) {
            throw new Error(`Invalid cell position: (${row}, ${col}) exceeds grid size.`);
        }
        const bitIndex = row * GRID_SIZE + col;
        const byteIndex = Math.floor(bitIndex / 8);
        const bitOffset = bitIndex % 8;
        bitmap[byteIndex] |= 1 << bitOffset;
    }
    return bitmap;
}

export const GameOfLife: FC = () => {
    const ourWallet = useWallet();
    const { connection } = useConnection();
    const [gameName, setGameName] = useState('');
    const [grid, setGrid] = useState(() => Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false)));


    const getProvider = () => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        setProvider(provider)
        return provider
    };

    const handleCellClick = (row: number, col: number) => {
        const newGrid = grid.map((rowArray, rowIndex) =>
            rowArray.map((cell, colIndex) =>
                rowIndex === row && colIndex === col ? !cell : cell
            )
        );
        setGrid(newGrid);
    };

    const createGame = async () => {
        const anchProvider = getProvider();
        const program = new Program<GameOfLifePda>(idl_object, anchProvider);
        console.log("program", program.programId.toString());

        const [feedPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(FEED_SEED)],
            program.programId
        );

        const [gamePda, gameBump] = getGameAddress(anchProvider.publicKey, gameName, program.programId)

        console.log("Creating game with PDA:", gamePda.toString());

        if (!gameName.trim()) {
            notify({ type: 'error', message: 'Please enter a game name!' });
            return;
        }

        const aliveCells: Array<[number, number]> = [];
        grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell) {
                    aliveCells.push([rowIndex, colIndex]);
                }
            });
        });

        if (aliveCells.length === 0) {
            notify({ type: 'error', message: 'Please select at least one cell!' });
            return;
        }

        try {
            const bitmap = Buffer.from(serializeBitmap(aliveCells));
            const tx = await program.methods
                .initialize(gameName, bitmap)
                .accounts({
                    gameOwner: anchProvider.publicKey,
                    feed: feedPda,
                    game: gamePda,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();

            console.log("Transaction signature:", tx);
        } catch (error) {
            console.error("Error creating game:", error);
        }
    };

    const getGameAddress = function (ownerKey, gameId, programId) {
        const paddedGameId = Buffer.alloc(32);
        const encodedGameId = Buffer.from(gameId, 'utf8');
        paddedGameId.set(encodedGameId.subarray(0, Math.min(encodedGameId.length, 32)));
        return PublicKey.findProgramAddressSync(
            [
                Buffer.from(GAME_SEED),
                ownerKey.toBuffer(),
                paddedGameId,
            ],
            programId
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-md">
                <input
                    type="text"
                    maxLength={32}
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="Enter game name (max 32 characters)"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                />
            </div>

            <div className="border border-gray-300 rounded-lg p-2 overflow-auto">
                <div className="grid" style={{
                    display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`, gap: '1px',
                }}>
                    {grid.map((row, rowIndex) => (
                        row.map((cell, colIndex) => (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                onClick={() => handleCellClick(rowIndex, colIndex)}
                                style={{
                                    width: `${CELL_SIZE}px`,
                                    height: `${CELL_SIZE}px`,
                                }}
                                className={`border cursor-pointer transition-colors duration-200 ${cell
                                    ? 'bg-indigo-500 hover:bg-indigo-600'
                                    : 'bg-white hover:bg-gray-100'
                                    }`}
                            />
                        ))
                    ))}
                </div>
            </div>

            <div className="relative group items-center">
                <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={createGame}
                    disabled={!ourWallet}
                >
                    <div className="hidden group-disabled:block">
                        Wallet not connected
                    </div>
                    <span className="block group-disabled:hidden">
                        Create Game
                    </span>
                </button>
            </div>
        </div>
    );
};
