import { Contract, utils } from "ethers";
import React, { useEffect, useState, useCallback } from "react"; 
import { NFT_CONTRACT_ADDRESS, ABI } from "../constants";

import { Form, Button, Table } from 'react-bootstrap';
import Image from 'next/image';
import styles from "../styles/Home.module.css";
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';

// --- Importaciones de Material-UI ---
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';


// Componente Alert personalizado para Snackbar (para usar el Alert de MUI)
const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Agricultor(props) {

    
    const [loading, setLoading] = useState(true);
    const [tokens, setTokens] = useState([]);
    
    const [selectedTokenId, setSelectedTokenId] = useState('');
    
    const [producto, setProducto] = useState('');
    const [lote, setLote] = useState('');
    const [fertilizante, setFertilizante] = useState('');

    // --- Estado para la Snackbar/Alert de MUI ---
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // 'success', 'info', 'warning', 'error'
   

    const comercioAddress = "0x71AF60DfAf489E86Ff9dfEEC167D839d0aa0FAe0";

    const getContract = async (needSigner = false) => {
        if (!props.provider) {
            console.warn("Provider no disponible en getContract.");
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
            setSnackbarMessage("Error al conectar con el contrato.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return null;
        }
    }

    
    const getTokens = useCallback(async () => {
        setLoading(true); 
        try {
            const trazabilidad = await getContract(true); 
            if (!trazabilidad) {
                console.warn("Contrato no inicializado, no se pudieron obtener los tokens.");
                return; 
            }
            const tokensOnChain = await trazabilidad.getTokenIds();
            let res = [];

            for (let i = 0; i < tokensOnChain.length; i++) {
                let id = tokensOnChain[i].toNumber();
                if (id !== 0) {
                    const attrs = await trazabilidad.obtenerAtributosToken(tokensOnChain[i]);
                    res.push({
                        tokenId: id,
                        producto: attrs[1],
                        lote: attrs[2],
                        fertilizante: attrs[3],
                        estado: attrs[4],
                    });
                }
            }
            setTokens(res);
            console.log("Tokens cargados:", res); 
        } catch (error) {
            console.error("Error al obtener los tokens:", error);
            setSnackbarMessage("Error al cargar los tokens: " + (error.reason || error.message || "Error desconocido."));
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false); 
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.provider]); 

    const minadoAgricultor = async () => {
        setLoading(true);
        try {
            if (!producto || !lote || !fertilizante) {
                setSnackbarMessage('Por favor, completa todos los campos para minar el token.');
                setSnackbarSeverity('warning');
                setSnackbarOpen(true);
                return;
            }

            let tokenId = Date.now(); 
            const trazabilidad = await getContract(true);
            if (!trazabilidad) return;

            const tx = await trazabilidad.minado(tokenId, producto, lote, fertilizante);

            setSnackbarMessage("Minando token...");
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            
            await tx.wait(); 

            setSnackbarMessage("Token minado exitosamente!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            await getTokens(); 

        } catch (error) {
            console.error("Error al minar el token:", error);
            let errorMessage = "Error desconocido.";
            if (error.code === 4001) {
                errorMessage = "Transacción rechazada por el usuario en MetaMask.";
            } else if (error.reason) {
                errorMessage = `Error: ${error.reason}`;
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            setSnackbarMessage(`Ha habido un error al minar el token: ${errorMessage}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);

        } finally {
            setLoading(false);
        }
    }

    const handleMint = event => {
        event.preventDefault();
        minadoAgricultor();
        
        setProducto('');
        setLote('');
        setFertilizante('');
    }

    const transferComercio = async () => {
        setLoading(true);
        try {
            if (!selectedTokenId) {
                setSnackbarMessage('Por favor, selecciona un token para transferir.');
                setSnackbarSeverity('warning');
                setSnackbarOpen(true);
                return;
            }

            const trazabilidad = await getContract(true);
            if (!trazabilidad) return;

            
            const tokenToTransfer = tokens.find(t => t.tokenId === selectedTokenId);
            if (!tokenToTransfer || tokenToTransfer.estado !== 0) {
                setSnackbarMessage('Solo puedes transferir tokens en estado "Nuevo".');
                setSnackbarSeverity('warning');
                setSnackbarOpen(true);
                setLoading(false);
                return;
            }

            const tx = await trazabilidad.transferirAComercio(utils.getAddress(comercioAddress), selectedTokenId);

            setSnackbarMessage("Transfiriendo token al comercio...");
            setSnackbarSeverity('info');
            setSnackbarOpen(true);

            await tx.wait(); 

            setSnackbarMessage("Token transferido al comercio exitosamente!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            await getTokens(); 
            setSelectedTokenId(''); 
            
        } catch (error) {
            console.error("Error al transferir el token:", error);
            let errorMessage = "Error desconocido.";
            if (error.code === 4001) {
                errorMessage = "Transacción rechazada por el usuario en MetaMask.";
            } else if (error.reason) {
                errorMessage = `Error: ${error.reason}`;
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            setSnackbarMessage(`Error al transferir el token: ${errorMessage}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);

        } finally {
            setLoading(false);
        }
    }

    const onClickTokenSelect = (tokenId) => { 
        
        const numTokenId = Number(tokenId);
        if (selectedTokenId === numTokenId) {
            setSelectedTokenId(''); 
        } else {
            setSelectedTokenId(numTokenId);
        }
        
    }

    const translateState = (state) => {
        switch (state) {
            case 0: return "Nuevo";
            case 1: return "Entregado";
            case 2: return "Aceptado";
            case 3: return "Rechazado";
            case 4: return "En transporte";
            case 5: return "En venta";
            case 6: return "Comprado";
            default: return "Desconocido";
        }
    }

    // --- Función para cerrar la Snackbar ---
    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };
    // --- Fin de Función para cerrar la Snackbar ---

    useEffect(() => {
        let trazabilidad; 
        let currentAccount;

        const init = async () => {
            console.log("Iniciando componente Agricultor ..");
            if (!props.provider) {
                console.warn("Provider no disponible. Reintentando en un momento...");
                
                setSnackbarMessage("MetaMask no detectado o conectado. Por favor, conecta tu wallet.");
                setSnackbarSeverity('warning');
                setSnackbarOpen(true);
                setLoading(false); 
                return;
            }

            try {
                
                const accounts = await props.provider.send("eth_requestAccounts", []);
                currentAccount = utils.getAddress(accounts[0]);
                console.log("Cuenta conectada:", currentAccount);

                
                trazabilidad = new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);
                console.log("Contrato de trazabilidad inicializado.");

                
                await getTokens(); 

               
                trazabilidad.on(trazabilidad.filters.Transaccion(currentAccount, currentAccount, 0), async (_from, _tokenId, _state) => {
                    console.log("Evento 'Nuevo' recibido:", _tokenId.toNumber());
                    await getTokens(); 
                    setSnackbarMessage(`¡Nuevo token (ID: ${_tokenId.toNumber()}) minado para ti!`);
                    setSnackbarSeverity('info');
                    setSnackbarOpen(true);
                });

                
                trazabilidad.on(trazabilidad.filters.Transaccion(currentAccount, utils.getAddress(comercioAddress), 1), async (_from, _tokenId, _state) => {
                    console.log("Evento 'Entregado a Comercio' recibido:", _tokenId.toNumber());
                    await getTokens();
                    setSnackbarMessage(`Token (ID: ${_tokenId.toNumber()}) entregado al comercio.`);
                    setSnackbarSeverity('success');
                    setSnackbarOpen(true);
                });

                
                trazabilidad.on(trazabilidad.filters.Transaccion(utils.getAddress(comercioAddress), currentAccount, 3), async (_from, _tokenId, _state) => {
                    console.log("Evento 'Rechazado por Comercio' recibido:", _tokenId.toNumber());
                    await getTokens();
                    setSnackbarMessage(`Token (ID: ${_tokenId.toNumber()}) rechazado por el comercio. Vuelve a intentarlo o descarta.`);
                    setSnackbarSeverity('warning');
                    setSnackbarOpen(true);
                });

                setLoading(false); 

            } catch (error) {
                console.error("Error en la inicialización del componente Agricultor:", error);
                setSnackbarMessage("Error al iniciar el componente: " + (error.reason || error.message || "Verifica tu conexión a Metamask."));
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                setLoading(false); 
            }
        };

        init(); 

        
        return () => {
            if (trazabilidad) {
                console.log("Removiendo listeners de trazabilidad...");
                trazabilidad.removeAllListeners();
            }
        };
    }, [props.provider, getTokens, comercioAddress]); 

    const selectedTokenEstado = tokens.find(t => t.tokenId === selectedTokenId)?.estado;

    return (
        <div>
            <div className={styles.main}>
                <div className={styles.title}>
                    <Image width={100} height={100} src="/agricultor.png" alt="icono agricultor" />
                    <h2>Agricultor</h2>
                </div>

                <Table striped bordered hover className={styles.table}>
                    <thead>
                        <tr>
                            <th>Selecciona</th>
                            <th>Token ID</th>
                            <th>Nombre de producto</th>
                            <th>Fertilizante</th>
                            <th>Número de lote</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>

                        {loading ?
                            <tr>
                                <td style={{ '--bs-table-accent-bg': 'white', 'textAlign': 'center' }} colSpan='6'>
                                    <Image width={100} height={20} src="/loading.gif" alt="loading..." />
                                    <p className={styles.p_no_margin}>Cargando, espera unos segundos...</p>
                                </td>
                            </tr>
                            :
                            tokens.length === 0 ?
                                <tr>
                                    <td style={{ '--bs-table-accent-bg': 'white', 'textAlign': 'center' }} colSpan='6'>
                                        <p className={styles.p_no_margin}>No hay productos disponibles para mostrar.</p>
                                        <p className={styles.p_no_margin}>Crea uno usando el formulario &quot;Nuevo Producto&quot;.</p>
                                    </td>
                                </tr>
                                :
                                tokens.map((item) => (
                                    <tr key={item.tokenId}> 
                                        <td>
                                            <Form.Check
                                                type='radio'
                                                id={`token-${item.tokenId}`}
                                                value={item.tokenId}
                                                name="selectedToken"
                                                checked={selectedTokenId === item.tokenId} 
                                                readOnly
                                                onClick={() => onClickTokenSelect(item.tokenId)}
                                            />
                                        </td>
                                        <td>{item.tokenId}</td>
                                        <td>{item.producto}</td>
                                        <td>{item.fertilizante}</td>
                                        <td>{item.lote}</td>
                                        <td>{translateState(item.estado)}</td>
                                    </tr>
                                ))
                        }

                    </tbody>
                </Table>


                <div className={styles.flexContainer}>
                    
                    <div className={styles.form}>
                        <Form onSubmit={handleMint}>
                            <h4>Nuevo Producto</h4>
                            <Form.Group className="mb-3" controlId="productName">
                                <Form.Label>Producto</Form.Label>
                                <Form.Control
                                    placeholder="Introduce el producto"
                                    value={producto}
                                    onChange={event => setProducto(event.target.value)}
                                    disabled={loading}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="lote"> 
                                <Form.Label>Lote</Form.Label>
                                <Form.Control
                                    placeholder="Número de lote"
                                    value={lote}
                                    onChange={event => setLote(event.target.value)}
                                    disabled={loading}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="fertilizante"> 
                                <Form.Label>Fertilizante</Form.Label>
                                <Form.Control
                                    placeholder="Fertilizante usado"
                                    value={fertilizante}
                                    onChange={event => setFertilizante(event.target.value)}
                                    disabled={loading}
                                />
                            </Form.Group>
                            {
                                <Button variant="primary" type="submit" disabled={producto === '' || lote === '' || fertilizante === '' || loading}>
                                    Crear
                                </Button>
                            }
                        </Form>
                    </div>

                   
                    <div className={styles.form}>
                        <h4>Transferir Producto al Comercio</h4>
                        {selectedTokenId ? (
                            <p>Token seleccionado: <strong>{selectedTokenId}</strong> (Estado: {translateState(selectedTokenEstado)})</p>
                        ) : (
                            <p>Selecciona un token &quot;Nuevo&quot;de la tabla.</p>
                        )}
                        <Button
                            variant="primary"
                            onClick={transferComercio}
                            
                            disabled={loading || !selectedTokenId || selectedTokenEstado !== 0}
                        >
                            Transferir al Comercio
                        </Button>
                    </div>
                </div>

            </div>

            
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%', zIndex: 9999 }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
            

        </div>
    )
}