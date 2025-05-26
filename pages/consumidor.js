import React, { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { BigNumber } from 'ethers';
import { formatEther } from '@ethersproject/units';
import { Web3Provider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import Card from './card'; // Asegúrate de que card.js exporta 'export default function Card...'
import styles from '../styles/Home.module.css';
import Image from 'next/image';
import { Grid, Box } from '@mui/material'; // Asegúrate de que tienes @mui/material instalado
import CircularProgress from '@mui/material/CircularProgress'; // Para el spinner de carga

// ABIs y Direcciones
const ABI = require('./ABI.json');
const ABI_NFT = require('./ABI_NFT.json');
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const NFTContractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;

// Función auxiliar para traducir estados
const translateState = (state) => {
    switch (state) {
        case 0: return 'Acuñado';
        case 1: return 'En Tránsito (Finca)';
        case 2: return 'En Tránsito (Producción)';
        case 3: return 'En Producción';
        case 4: return 'En Tránsito (Envasado)';
        case 5: return 'Envasado';
        case 6: return 'En Tránsito (Tienda)';
        case 7: return 'En Tienda';
        case 8: return 'Vendido';
        case 9: return 'Perdido';
        default: return 'Desconocido';
    }
};

export default function Consumidor() {
    const { library, active } = useWeb3React();
    const [contract, setContract] = useState(null);
    const [NFTContract, setNFTContract] = useState(null);
    const [tokenId, setTokenId] = useState('');
    const [selectedTokenId, setSelectedTokenId] = useState('');
    const [tokensAvailable, setTokensAvailable] = useState([]);
    const [tokensBought, setTokensBought] = useState([]);
    const [loadingTokens, setLoadingTokens] = useState(true);
    const [cards, setCards] = useState([]); // Array de componentes Card ya renderizados
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState(null); // Para manejar errores

    // 1. Obtener instancias del contrato
    useEffect(() => {
        if (active && library) {
            try {
                const signer = library.getSigner();
                const mainContract = new Contract(contractAddress, ABI, signer);
                const nftContract = new Contract(NFTContractAddress, ABI_NFT, signer);
                setContract(mainContract);
                setNFTContract(nftContract);
                setError(null); // Limpiar errores previos
            } catch (err) {
                console.error("Error al obtener instancias del contrato:", err);
                setError("Error al conectar con los contratos. Asegúrate de que tu monedero está conectado y configurado correctamente.");
            }
        }
    }, [active, library]);

    // 2. Cargar tokens disponibles y comprados
    useEffect(() => {
        const getTokens = async () => {
            if (NFTContract && contract) {
                setLoadingTokens(true);
                setError(null);
                try {
                    const totalTokens = await NFTContract.totalSupply();
                    const available = [];
                    const bought = [];

                    for (let i = 0; i < totalTokens.toNumber(); i++) {
                        const tokenId = i;
                        const estado = await contract.obtenerEstado(tokenId);
                        if (estado === 7) { // En Tienda
                            available.push(tokenId);
                        } else if (estado === 8) { // Vendido
                            bought.push(tokenId);
                        }
                    }
                    setTokensAvailable(available);
                    setTokensBought(bought);
                } catch (err) {
                    console.error("Error al cargar tokens:", err);
                    setError("No se pudieron cargar los tokens. Intenta recargar la página.");
                } finally {
                    setLoadingTokens(false);
                }
            }
        };
        getTokens();
    }, [NFTContract, contract]);

    // 3. Función para obtener datos históricos de un token
    // Esta función ahora solo devuelve los datos, no los componentes Card
    const fetchHistoryData = async (events, contractInstance, nftContractInstance) => {
        const historyData = [];
        let visitedMint = false; // Solo para saber si el selectedTokenId fue el acuñado

        for (const event of events) {
            try {
                const tokenId = event.args._tokenId.toString();
                const owner = await nftContractInstance.ownerOf(tokenId); // Asegura que ownerOf es un BigNumber si es necesario
                const estado = await contractInstance.obtenerEstado(Number(tokenId));
                const temperatura = await contractInstance.obtenerTemperatura(Number(tokenId));
                const price = await contractInstance.getPrice(Number(tokenId));

                const attrs = await contractInstance.getAttrs(Number(tokenId));
                const user = await contractInstance.getUserFromAddress(owner);

                // Aquí se construye el objeto de datos completo para cada tarjeta
                const completeData = {
                    tokenId: tokenId,
                    owner: owner,
                    estado: translateState(estado), // Asegúrate de que translateState siempre devuelve string
                    price: formatEther(price.toString()), // Convierte BigNumber a string
                    temperatura: temperatura.toString(), // Convierte BigNumber a string
                    attrs: {
                        fecha_registro: attrs[0],
                        ciudad_origen: attrs[1],
                        fecha_cosecha: attrs[2],
                        ciudad_produccion: attrs[3],
                        fecha_produccion: attrs[4],
                        ciudad_envasado: attrs[5],
                        fecha_envasado: attrs[6],
                    },
                    user: user,
                    block: event.blockNumber,
                    transactionHash: event.transactionHash,
                };

                historyData.push(completeData);

                // Lógica de visitedMint (si sigue siendo necesaria)
                if (tokenId === selectedTokenId) {
                    visitedMint = true;
                }

            } catch (err) {
                console.error(`Error procesando evento para token ${event.args._tokenId}:`, err);
                // Decide cómo manejar errores individuales. Puedes loggearlos o añadir un placeholder.
            }
        }
        return historyData;
    };

    // 4. Cargar y mostrar historial cuando se selecciona un token
    useEffect(() => {
        const loadHistory = async () => {
            if (selectedTokenId === '' || !contract || !NFTContract) {
                setCards([]); // Limpiar tarjetas si no hay token seleccionado
                setLoadingHistory(false);
                setError(null);
                return;
            }

            setLoadingHistory(true);
            setCards([]); // Limpiar tarjetas mientras se carga el nuevo historial
            setError(null);

            try {
                const filter = contract.filters.Transaccion(null, Number(selectedTokenId), null);
                const events = await contract.queryFilter(filter, 0, 'latest');

                // Obtener solo los datos del historial
                const data = await fetchHistoryData(events, contract, NFTContract);

                // Mapear los datos a componentes <Card />
                // Ordenar por blockNumber para asegurar el orden cronológico
                const sortedCards = data
                    .sort((a, b) => a.block - b.block)
                    .map((item) => (
                        <Card
                            key={`${item.tokenId}-${item.block}-${item.transactionHash}`} // Clave única y estable
                            data={item}
                        />
                    ));

                setCards(sortedCards);
            } catch (err) {
                console.error("Error al cargar el historial del token:", err);
                setError("No se pudo cargar el historial para el token seleccionado.");
                setCards([]); // Asegúrate de que cards esté vacío en caso de error
            } finally {
                setLoadingHistory(false);
            }
        };

        loadHistory();
    }, [selectedTokenId, contract, NFTContract]); // Dependencias: token, contratos

    // 5. Componente de renderizado de las tarjetas del historial
    // Ahora 'cards' ya contiene los componentes <Card/>
    const HistoryBox = () => {
        if (loadingHistory) {
            return (
                <div className={styles.loadingContainer}>
                    <CircularProgress />
                    <p>Cargando historial...</p>
                </div>
            );
        }

        if (error) {
            return <p className={styles.errorMessage}>{error}</p>;
        }

        if (selectedTokenId === '') {
            return <p className={styles.p_no_history}>No hay producto seleccionado</p>;
        }

        if (cards.length === 0) {
            return <p className={styles.p_no_history}>No hay historial disponible para este producto.</p>;
        }

        return (
            <Box className={styles.boxCustomer}>
                <h4 style={{ textAlign: 'center' }}>Historial del Token {selectedTokenId}</h4>
                <hr style={{ marginBottom: '5%', marginTop: '0%' }}></hr>
                <Grid container direction="column" spacing={2}> {/* Espacio entre las tarjetas */}
                    {cards.map((cardComponent) => (
                        // cardComponent ya es el JSX de <Card />, solo necesitas envolverlo en Grid.item
                        <Grid item key={cardComponent.key} width="100%">
                            {cardComponent}
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    };

    const handleTokenIdChange = (e) => {
        setTokenId(e.target.value);
    };

    const handleSearchClick = () => {
        setSelectedTokenId(tokenId);
    };

    return (
        <div className={styles.container}>
            <main className={styles.main}>
                <h1 className={styles.title}>
                    Consumidor
                </h1>
                <p className={styles.description}>
                    Consulta la trazabilidad de un producto
                </p>

                {error && <p className={styles.errorMessage}>{error}</p>}

                {loadingTokens ? (
                    <div className={styles.loadingContainer}>
                        <CircularProgress />
                        <p>Cargando tokens...</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        <div className={styles.card}>
                            <h2>Tokens Disponibles</h2>
                            <p>Cantidad: {tokensAvailable.length}</p>
                            <ul>
                                {tokensAvailable.map((token) => (
                                    <li key={token}>Token ID: {token}</li>
                                ))}
                            </ul>
                        </div>

                        <div className={styles.card}>
                            <h2>Tokens Vendidos</h2>
                            <p>Cantidad: {tokensBought.length}</p>
                            <ul>
                                {tokensBought.map((token) => (
                                    <li key={token}>Token ID: {token}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <hr style={{ width: '80%', margin: '40px 0' }}></hr>

                <div className={styles.flexContainer}>
                    <input
                        type="number"
                        placeholder="ID del Token"
                        value={tokenId}
                        onChange={handleTokenIdChange}
                        className={styles.inputField}
                    />
                    <button onClick={handleSearchClick} className={styles.button}>
                        Buscar Historial
                    </button>
                </div>

                <div className={styles.flexContainerHistory}>
                    <HistoryBox /> {/* Renderiza el componente de historial */}
                </div>
            </main>
        </div>
    );
}