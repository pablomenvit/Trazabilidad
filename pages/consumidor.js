import { Contract, utils, BigNumber } from "ethers";
import React, { useEffect, useState, useCallback } from "react";
import { NFT_CONTRACT_ADDRESS, ABI } from "../constants";
// Estilos y componentes de UI
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Image from 'next/image';
import styles from "../styles/Home.module.css";
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import Card from './card'; // Importación del componente Card

import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

// Componente Alert personalizado para Snackbar.
// Utiliza React.forwardRef para que Snackbar pueda acceder a la referencia interna.
const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Consumidor(props) {
    // Estados para controlar el estado de carga de los diferentes datos.
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [loadingBought, setLoadingBought] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Estados para almacenar los tokens disponibles y los comprados.
    const [tokensAvailable, setTokensIdsAvailable] = useState([]);
    const [tokensBought, setTokensIdsBought] = useState([]);
    const [historyCardsData, setHistoryCardsData] = useState([]); // Ahora guarda los datos crudos del historial

    // Estado para la selección de tokens y el historial.
    const [prevIndex, setPrevIndex] = useState(null); // Índice del token previamente seleccionado para el historial
    const [selectedTokenId, setSelectedTokenId] = useState(''); // ID del token seleccionado

    // Estados para la gestión de notificaciones Snackbar.
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [snackbarAutoCloseDuration, setSnackbarAutoCloseDuration] = useState(6000);

    // Estados para los balances y precios de demostración.
    const [agricultorDelToken, setAgricultorDelToken] = useState('');
    const [agricultorBalance, setAgricultorBalance] = useState('');
    const [comercioDireccion, setComercioDireccion] = useState('');
    const [comercioBalance, setComercioBalance] = useState('');
    const [transporteDireccion, setTransporteDireccion] = useState('');
    const [transporteBalance, setTransporteBalance] = useState('');
    const [precioTokenWei, setPrecioTokenWei] = useState(BigNumber.from(0));
    const [precioTokenEth, setPrecioTokenEth] = useState('0');

    // Manejador para cerrar el Snackbar.
    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    // Función memorizada para obtener la instancia del contrato, con o sin signer.
    const getContract = useCallback(async (needSigner = false) => {
        if (!props.provider) {
            console.warn("Proveedor no disponible. No se puede obtener el contrato.");
            return null;
        }
        try {
            if (needSigner) {
                const signer = props.provider.getSigner();
                return new Contract(NFT_CONTRACT_ADDRESS, ABI, signer);
            }
            return new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);
        } catch (error) {
            console.error("Error al obtener el contrato:", error);
            setSnackbarMessage("Error al inicializar el contrato.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return null;
        }
    }, [props.provider]); // Depende de props.provider

    // Función auxiliar para obtener atributos de tokens y filtrar por estado.
    const getAttrs = async (aux, trazabilidad, tokens, bought) => {
        for (let i = 0; i < tokens.length; i++) {
            const id = tokens[i].toNumber(); // Asegura que id es un número
            if (id !== 0) { // Evita procesar IDs inválidos (ej. 0)
                try {
                    const attrs = await trazabilidad.obtenerAtributosToken(id);
                    const estado = attrs[4];

                    if (bought) {
                        if (estado === 6) { // Si el token está 'Comprado'
                            aux.push({ tokenId: id, producto: attrs[1], fertilizante: attrs[3], lote: attrs[2], estado: estado });
                        }
                    } else {
                        if (estado === 5) { // Si el token está 'En venta'
                            const priceWei = await trazabilidad.getPrice(id);
                            // Convertir precio a EUR (ejemplo: 1 ETH = 10 EUR, ajustar según necesites)
                            const precioEUR = parseFloat(utils.formatEther(priceWei)) * 10;
                            aux.push({
                                tokenId: id,
                                producto: attrs[1],
                                fertilizante: attrs[3],
                                lote: attrs[2],
                                estado: estado,
                                precio: precioEUR, // Precio en EUR
                                precioWei: priceWei, // Precio en Wei (BigNumber)
                                creadoPor: attrs[0] // Dirección del creador/agricultor
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error al obtener atributos para el token ID ${id}:`, error);
                    // Opcionalmente, mostrar un snackbar aquí para errores de tokens individuales
                }
            }
        }
        return aux;
    };

    // Función memorizada para obtener los tokens disponibles y/o comprados.
    const getTokens = useCallback(async (alsoBought = false) => {
        setLoadingAvailable(true);
        if (alsoBought) setLoadingBought(true);

        const trazabilidad = await getContract();
        if (!trazabilidad) {
            setLoadingAvailable(false);
            setLoadingBought(false);
            return;
        }

        try {
            const tokensAvailableIds = await trazabilidad.getTokenIdsOnSale();
            const availableAttrs = await getAttrs([], trazabilidad, tokensAvailableIds, false);
            setTokensIdsAvailable(availableAttrs);
        } catch (error) {
            console.error("Error al cargar tokens disponibles:", error);
            setSnackbarMessage("Error al cargar productos disponibles.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoadingAvailable(false);
        }

        if (alsoBought) {
            try {
                // Obtener la cuenta actual para filtrar los tokens comprados por el usuario
                const accounts = await props.provider.send("eth_requestAccounts", []);
                const currentAccount = utils.getAddress(accounts[0]);

                const trazabilidadWithSigner = await getContract(true);
                if (!trazabilidadWithSigner) return;

                const tokensBoughtIds = await trazabilidadWithSigner.getTokenIds();
                const boughtAttrs = await getAttrs([], trazabilidadWithSigner, tokensBoughtIds, true);
                setTokensIdsBought(boughtAttrs.filter(token => token.creadoPor === currentAccount)); // Filtrar por tokens comprados por el usuario actual
            } catch (error) {
                console.error("Error al cargar tokens comprados:", error);
                setSnackbarMessage("Error al cargar tus productos comprados.");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            } finally {
                setLoadingBought(false);
            }
        }
    }, [getContract, props.provider]); // Depende de getContract y props.provider

    // Función memorizada para obtener y mostrar los balances relacionados con un token.
    const fetchAndDisplayBalances = useCallback(async (tokenId) => {
        const trazabilidadNoSigner = await getContract(false);
        if (!trazabilidadNoSigner) return;

        try {
            let creadorDelToken = '';
            // Buscar el token seleccionado en la lista de disponibles (si ya se cargó)
            const selectedToken = tokensAvailable.find(t => t.tokenId === Number(tokenId));
            if (selectedToken) {
                creadorDelToken = selectedToken.creadoPor;
                setAgricultorDelToken(creadorDelToken);
            } else {
                // Si el token no está en la lista de disponibles (ej. recién cargado o no visible),
                // obtener sus atributos directamente.
                const attrs = await trazabilidadNoSigner.obtenerAtributosToken(tokenId);
                creadorDelToken = attrs[0];
                setAgricultorDelToken(creadorDelToken);
            }

            const comercioAddr = await trazabilidadNoSigner.comercioAddress();
            const transporteAddr = await trazabilidadNoSigner.transporteAddress();
            setComercioDireccion(comercioAddr);
            setTransporteDireccion(transporteAddr);

            const provider = props.provider;
            if (provider) {
                const balAgricultor = await provider.getBalance(creadorDelToken);
                setAgricultorBalance(utils.formatEther(balAgricultor));

                const balComercio = await provider.getBalance(comercioAddr);
                setComercioBalance(utils.formatEther(balComercio));

                const balTransporte = await provider.getBalance(transporteAddr);
                setTransporteBalance(utils.formatEther(balTransporte));
            }

            const tokenPriceWei = await trazabilidadNoSigner.getPrice(tokenId);
            setPrecioTokenWei(tokenPriceWei);
            setPrecioTokenEth(utils.formatEther(tokenPriceWei));

        } catch (error) {
            console.error("Error al obtener y mostrar balances:", error);
            setSnackbarMessage("Error al cargar los balances para la demostración.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    }, [getContract, props.provider, tokensAvailable]); // Depende de getContract, props.provider y tokensAvailable

    // Manejador para la compra de un token.
    const handleBuyToken = async () => {
        try {
            if (!selectedTokenId) {
                setSnackbarMessage('Por favor, selecciona un token para comprar.');
                setSnackbarSeverity('warning');
                setSnackbarAutoCloseDuration(6000);
                setSnackbarOpen(true);
                return;
            }

            const selectedToken = tokensAvailable.find(t => t.tokenId === Number(selectedTokenId));
            if (!selectedToken || selectedToken.estado !== 5) {
                setSnackbarMessage('El token seleccionado no está en venta o ya no está disponible.');
                setSnackbarSeverity('warning');
                setSnackbarAutoCloseDuration(6000);
                setSnackbarOpen(true);
                return;
            }

            setSnackbarMessage('Obteniendo balances actuales...');
            setSnackbarSeverity('info');
            setSnackbarAutoCloseDuration(2000); // Mensaje más corto para feedback rápido
            setSnackbarOpen(true);
            await fetchAndDisplayBalances(selectedTokenId); // Actualiza los balances antes de la compra

            setLoadingAvailable(true); // Activa los estados de carga
            setLoadingBought(true);
            const trazabilidad = await getContract(true); // Necesitamos un signer para enviar transacciones
            if (!trazabilidad) return;

            // Usar el precio en Wei que ya está en el objeto selectedToken
            const precioAPagar = BigNumber.from(selectedToken.precioWei);

            setSnackbarMessage(`Enviando transacción de compra por ${utils.formatEther(precioAPagar)} ETH...`);
            setSnackbarSeverity('info');
            setSnackbarAutoCloseDuration(6000);
            setSnackbarOpen(true);

            const tx = await trazabilidad.buy(selectedTokenId, { value: precioAPagar });

            setSnackbarMessage(`Transacción enviada. Esperando confirmación... Hash: ${tx.hash}`);
            setSnackbarSeverity('info');
            setSnackbarAutoCloseDuration(8000);
            setSnackbarOpen(true);

            const receipt = await tx.wait(); // Espera a que la transacción se confirme en la blockchain

            if (receipt.status === 1) { // La transacción fue exitosa
                setSnackbarMessage(`¡Token ${selectedTokenId} comprado exitosamente! Actualizando balances y productos...`);
                setSnackbarSeverity('success');
                setSnackbarAutoCloseDuration(8000);
                setSnackbarOpen(true);

                await fetchAndDisplayBalances(selectedTokenId); // Vuelve a cargar balances después de la compra
                await getTokens(true); // Vuelve a cargar tanto los tokens disponibles como los comprados
                setSelectedTokenId(''); // Limpia la selección
                setPrevIndex(null); // Limpia el índice previo
                setPrecioTokenWei(BigNumber.from(0)); // Reinicia el precio
                setPrecioTokenEth('0');
            } else {
                setSnackbarMessage(`La transacción de compra del token ${selectedTokenId} falló.`);
                setSnackbarSeverity('error');
                setSnackbarAutoCloseDuration(6000);
                setSnackbarOpen(true);
                console.error("Transacción fallida, recibo:", receipt);
            }
        } catch (error) {
            console.error("Error al comprar el token:", error);
            let errorMessage = "Error desconocido.";
            if (error.code === 4001) { // Código de error para 'usuario rechazó la transacción'
                errorMessage = "Transacción rechazada por el usuario en MetaMask.";
            } else if (error.reason) { // Mensaje de revert del contrato
                errorMessage = `Error de contrato: ${error.reason}`;
            } else if (error.message) { // Otros mensajes de error
                errorMessage = `Error: ${error.message}`;
            }
            setSnackbarMessage(`Ha habido un error al comprar el token: ${errorMessage}`);
            setSnackbarSeverity('error');
            setSnackbarAutoCloseDuration(6000);
            setSnackbarOpen(true);
        } finally {
            setLoadingAvailable(false); // Desactiva los estados de carga al finalizar
            setLoadingBought(false);
        }
    };

    // Función memorizada para obtener el historial de transacciones de un token.
    // Esta función ahora devuelve los datos crudos, no componentes JSX.
    const getHistory = useCallback(async (tokenId) => {
        const trazabilidad = await getContract();
        if (!trazabilidad) return []; // Retorna un array vacío si el contrato no está listo

        try {
            // Filtra los eventos de 'Transaccion' por el ID del token.
            const filter = trazabilidad.filters.Transaccion(null, Number(tokenId), null);
            const events = await trazabilidad.queryFilter(filter, 0, 'latest');
            const processedData = [];

            // Ordena los eventos por número de bloque para asegurar el orden cronológico.
            events.sort((a, b) => a.blockNumber - b.blockNumber);

            for (const event of events) {
                try {
                    // Obtiene información adicional para cada evento.
                    const user = await trazabilidad.obtenerInformacionUsuario(event.args._desde);
                    const block = await event.getBlock(event.blockNumber);
                    const attrs = await trazabilidad.obtenerAtributosToken(Number(event.args._tokenId));
                    const price = await trazabilidad.getPrice(Number(event.args._tokenId));
                    const temperatura = await trazabilidad.obtenerTemperatura(Number(event.args._tokenId));

                    processedData.push({
                        operation: event.args._estado,
                        tokenId: event.args._tokenId.toNumber(),
                        blockTimestamp: block.timestamp * 1000, // Convertir a milisegundos para Date
                        blockNumber: event.blockNumber,
                        txHash: event.transactionHash,
                        attrs: { fertilizante: attrs[3], producto: attrs[1], lote: attrs[2], currentState: attrs[4] },
                        user: { nombre: user[0], role: user[1] },
                        precio: parseInt(price.toString()), // Precio en EUR
                        temperaturaMin: temperatura[0],
                        temperaturaMax: temperatura[1]
                    });
                } catch (eventError) {
                    console.error(`Error al procesar el evento para el token ${event.args._tokenId}:`, eventError);
                    // Continúa procesando otros eventos incluso si uno falla.
                }
            }
            return processedData; // Devuelve los datos procesados
        } catch (error) {
            console.error("Error al obtener el historial:", error);
            setSnackbarMessage("Hubo un error al obtener el historial.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return [];
        }
    }, [getContract]);

    // Manejador para cuando se selecciona un token en la tabla (radio button).
    const onClickTokenSelect = useCallback((tokenId, index) => {
        // Si el token ya estaba seleccionado, lo deselecciona.
        if (prevIndex === index) {
            setPrevIndex(null);
            setSelectedTokenId('');
            setHistoryCardsData([]); // Limpiar historial
            // Limpiar también los balances y precios mostrados
            setAgricultorDelToken('');
            setAgricultorBalance('');
            setComercioDireccion('');
            setComercioBalance('');
            setTransporteDireccion('');
            setTransporteBalance('');
            setPrecioTokenWei(BigNumber.from(0));
            setPrecioTokenEth('0');
        } else {
            // Selecciona el nuevo token y actualiza los estados.
            setPrevIndex(index);
            setSelectedTokenId(tokenId);
            fetchAndDisplayBalances(tokenId); // Carga los balances relacionados con el token seleccionado
        }
    }, [prevIndex, fetchAndDisplayBalances]); // Depende de prevIndex y fetchAndDisplayBalances

    // Efecto para la carga inicial de datos y la configuración de listeners de eventos del contrato.
    useEffect(() => {
        const init = async () => {
            if (!props.provider) return;

            setLoadingAvailable(true);
            setLoadingBought(true);
            await getTokens(true); // Carga inicial de tokens disponibles y comprados

            const trazabilidad = await getContract();
            if (!trazabilidad) return;

            try {
                // Obtener direcciones de Comercio y Transporte
                const comercioAddr = await trazabilidad.comercioAddress();
                const transporteAddr = await trazabilidad.transporteAddress();
                setComercioDireccion(comercioAddr);
                setTransporteDireccion(transporteAddr);
            } catch (err) {
                console.error("Error al obtener direcciones de Comercio/Transporte:", err);
            }

            // Listener para nuevos tokens puestos en venta (estado 5).
            const handleTokenOnSale = (_from, _tokenId, _state) => {
                setSnackbarMessage('Detectado nuevo token en venta. Actualizando lista...');
                setSnackbarSeverity('info');
                setSnackbarAutoCloseDuration(3000);
                setSnackbarOpen(true);
                getTokens(false); // Solo refresca los tokens disponibles
            };
            trazabilidad.on(trazabilidad.filters.Transaccion(null, null, 5), handleTokenOnSale);

            // Listener para tokens comprados (estado 6).
            let currentAccount; // Variable para almacenar la cuenta actual
            const handleTokenBought = async (_from, _tokenId, _state) => {
                // Si la cuenta actual no está seteada, la obtenemos.
                if (!currentAccount && props.provider) {
                    const accounts = await props.provider.send("eth_requestAccounts", []);
                    currentAccount = utils.getAddress(accounts[0]);
                }
                // Si el comprador es la cuenta actual, actualizamos los datos.
                if (utils.getAddress(_from) === currentAccount) {
                    setSnackbarMessage(`Evento "Token Comprado" recibido para Token ${_tokenId.toNumber()}`);
                    setSnackbarSeverity('info');
                    setSnackbarAutoCloseDuration(3000);
                    setSnackbarOpen(true);
                    getTokens(true); // Refresca tanto los tokens disponibles como los comprados
                }
            };
            trazabilidad.on(trazabilidad.filters.Transaccion(null, null, 6), handleTokenBought);

            // Función de limpieza para eliminar los listeners cuando el componente se desmonte.
            return () => {
                trazabilidad.off(trazabilidad.filters.Transaccion(null, null, 5), handleTokenOnSale);
                trazabilidad.off(trazabilidad.filters.Transaccion(null, null, 6), handleTokenBought);
            };
        };

        init();
    }, [props.provider, getTokens, getContract]); // Dependencias de este efecto

    // Efecto para cargar el historial de un token cuando 'selectedTokenId' cambia.
    useEffect(() => {
        async function fetchSelectedTokenHistory() {
            if (selectedTokenId !== '') {
                setLoadingHistory(true); // Activa el estado de carga del historial
                setHistoryCardsData([]); // Limpia el historial previo
                const data = await getHistory(selectedTokenId); // Obtiene los datos crudos
                setHistoryCardsData(data); // Almacena los datos
                setLoadingHistory(false); // Desactiva el estado de carga
            } else {
                setHistoryCardsData([]); // Si no hay token seleccionado, el historial está vacío
            }
        }
        fetchSelectedTokenHistory();
    }, [selectedTokenId, getHistory]); // Depende de selectedTokenId y getHistory

    // Calcular los pagos esperados para la demostración.
    // BigNumber.isZero() es más seguro que solo verificar 'precioTokenWei'.
    const expectedAgricultorPayment = precioTokenWei.isZero() ? '0' : utils.formatEther(precioTokenWei.mul(35).div(100));
    const expectedComercioPayment = precioTokenWei.isZero() ? '0' : utils.formatEther(precioTokenWei.mul(50).div(100));
    const expectedTransportePayment = precioTokenWei.isZero() ? '0' : utils.formatEther(precioTokenWei.mul(15).div(100));

    // Busca el objeto del token seleccionado en la lista de disponibles para obtener su precio y estado.
    const selectedAvailableTokenObj = tokensAvailable.find(t => t.tokenId === Number(selectedTokenId));

    return (
        <div>
            <div className={styles.main}>
                <div className={styles.title}>
                    <Image width={100} height={100} src="/customerColor.png" alt="customer icon" />
                    <h2>Consumidor</h2>
                </div>

                <h3 className={styles.subtitle}>Productos disponibles</h3>
                <hr className={styles.hrCustomer}></hr>
                <Table striped bordered hover className={styles.table}>
                    <thead>
                        <tr>
                            <th>Ver historial</th>
                            <th>Token ID</th>
                            <th>Producto</th>
                            <th>Fertilizante</th>
                            <th>Lote</th>
                            <th>Precio (EUR)</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            loadingAvailable ?
                                <tr>
                                    <td style={{ '--bs-table-accent-bg': 'white', 'textAlign': 'center' }} colSpan='7'>
                                        <Image width={100} height={30} src="/loading.gif" alt="cargando.." />
                                        <p className={styles.p_no_margin}>Cargando, espere unos segundos..</p>
                                    </td>
                                </tr>
                                :
                                tokensAvailable.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', '--bs-table-accent-bg': 'white' }}>No hay productos disponibles para la venta.</td>
                                    </tr>
                                ) :
                                    tokensAvailable.map((item, index) => (
                                        <tr key={"available_" + item.tokenId}> {/* Clave única y estable */}
                                            <td>
                                                <Form.Check
                                                    type='radio'
                                                    id={`token-available-${item.tokenId}`}
                                                    value={item.tokenId}
                                                    name="selectedToken"
                                                    checked={selectedTokenId === String(item.tokenId)}
                                                    readOnly // El control se gestiona mediante el onClick
                                                    onClick={event => onClickTokenSelect(event.target.value, "available_" + index)}
                                                />
                                            </td>
                                            <td>{item.tokenId}</td>
                                            <td>{item.producto}</td>
                                            <td>{item.fertilizante}</td>
                                            <td>{item.lote}</td>
                                            <td>{item.precio}</td>
                                            <td>
                                                <Button
                                                    // El onClick ya no necesita el value, toma selectedTokenId del estado
                                                    variant="primary"
                                                    onClick={handleBuyToken}
                                                    // Deshabilita el botón si está cargando o si este no es el token seleccionado
                                                    disabled={loadingAvailable || loadingBought || selectedTokenId !== String(item.tokenId)}
                                                >
                                                    Comprar
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                        }
                    </tbody>
                </Table>

                {/* Sección de Balances de Demostración */}
                {selectedTokenId && (
                    <div className={styles.sectionContainer}>
                        <h3 className={styles.subtitle}>Balances de Demostración</h3>
                        <hr className={styles.hrCustomer}></hr>
                        <Box sx={{ flexGrow: 1, p: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="h6" color="primary">Agricultor</Typography>
                                    <Typography variant="body1">Dirección: {agricultorDelToken || 'Cargando...'}</Typography>
                                    <Typography variant="body1">Balance: {agricultorBalance || 'Cargando...'} ETH</Typography>
                                    <Typography variant="body1">Recibe: {expectedAgricultorPayment} ETH</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="h6" color="primary">Comercio</Typography>
                                    <Typography variant="body1">Dirección: {comercioDireccion || 'Cargando...'}</Typography>
                                    <Typography variant="body1">Balance: {comercioBalance || 'Cargando...'} ETH</Typography>
                                    <Typography variant="body1">Recibe: {expectedComercioPayment} ETH</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="h6" color="primary">Transporte</Typography>
                                    <Typography variant="body1">Dirección: {transporteDireccion || 'Cargando...'}</Typography>
                                    <Typography variant="body1">Balance: {transporteBalance || 'Cargando...'} ETH</Typography>
                                    <Typography variant="body1">Recibe: {expectedTransportePayment} ETH</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="h6" color="primary">Precio del Token Seleccionado</Typography>
                                    <Typography variant="body1">Precio en Wei: {precioTokenWei.toString()}</Typography>
                                    <Typography variant="body1">Precio en ETH: {precioTokenEth}</Typography>
                                    <Typography variant="body1">Precio en EUR: {selectedAvailableTokenObj?.precio || '0'} €</Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    </div>
                )}


                <h3 className={styles.subtitle}>Tus Productos Comprados</h3>
                <hr className={styles.hrCustomer}></hr>
                <Table striped bordered hover className={styles.table}>
                    <thead>
                        <tr>
                            <th>Token ID</th>
                            <th>Producto</th>
                            <th>Fertilizante</th>
                            <th>Lote</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            loadingBought ?
                                <tr>
                                    <td style={{ '--bs-table-accent-bg': 'white', 'textAlign': 'center' }} colSpan='5'>
                                        <Image width={100} height={30} src="/loading.gif" alt="cargando.." />
                                        <p className={styles.p_no_margin}>Cargando, espere unos segundos..</p>
                                    </td>
                                </tr>
                                :
                                tokensBought.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', '--bs-table-accent-bg': 'white' }}>No has comprado ningún producto aún.</td>
                                    </tr>
                                ) :
                                    tokensBought.map((item) => (
                                        <tr key={"bought_" + item.tokenId}> {/* Clave única y estable */}
                                            <td>{item.tokenId}</td>
                                            <td>{item.producto}</td>
                                            <td>{item.fertilizante}</td>
                                            <td>{item.lote}</td>
                                            <td>Comprado</td>
                                        </tr>
                                    ))
                        }
                    </tbody>
                </Table>

                {/* Sección de Historial del Token Seleccionado */}
                {selectedTokenId && (
                    <div className={styles.sectionContainer}>
                        <h3 className={styles.subtitle}>Historial del Token ID: {selectedTokenId}</h3>
                        <hr className={styles.hrCustomer}></hr>
                        <Box sx={{ flexGrow: 1, p: 2 }}>
                            <Grid container spacing={2}>
                                {
                                    loadingHistory ? (
                                        <Grid item xs={12} style={{ textAlign: 'center' }}>
                                            <Image width={100} height={30} src="/loading.gif" alt="cargando.." />
                                            <Typography variant="body1" color="text.secondary">Cargando historial...</Typography>
                                        </Grid>
                                    ) : historyCardsData.length === 0 ? (
                                        <Grid item xs={12} style={{ textAlign: 'center' }}>
                                            <Typography variant="body1" color="text.secondary">No hay historial disponible para este token.</Typography>
                                        </Grid>
                                    ) : (
                                        historyCardsData.map((data, index) => (
                                            // Se renderiza el componente Card aquí, pasándole los datos.
                                            // La clave es crucial para el rendimiento y la estabilidad de las listas.
                                            <Grid item xs={12} sm={6} md={4} key={`history-card-${data.blockNumber}-${data.txHash}-${index}`}>
                                                <Card data={data} />
                                            </Grid>
                                        ))
                                    )
                                }
                            </Grid>
                        </Box>
                    </div>
                )}
            </div>

            {/* Componente Snackbar para notificaciones al usuario */}
            <Snackbar open={snackbarOpen} autoHideDuration={snackbarAutoCloseDuration} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </div>
    );
}