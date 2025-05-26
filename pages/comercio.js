import { Contract, utils } from "ethers";
import React, { useEffect, useState } from "react";
import { NFT_CONTRACT_ADDRESS, ABI } from "../constants";

import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Image from 'next/image';
import styles from "../styles/Home.module.css";
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';

import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
// Componente Alert personalizado para Snackbar
const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Transporte(props) {

  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [prevIndex, setPrevIndex] = useState(null);
  const [selectedTokenId, setSelectedTokenId] = useState('');

   
  const [precioProducto, setPrecioProducto] = useState('');
  
  const [isNew, setIsNew] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [precioAsignado, setPrecioAsignado] = useState(false);

 const [snackbarOpen, setSnackbarOpen] = useState(false);
 const [snackbarMessage, setSnackbarMessage] = useState('');
 const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // 'success', 'info', 'warning', 'error' 

 const transporteAddress = '0xDfe91ee7f72e6820D2F4e9f1C5A801A85dD4f2ca';
  

  const getContract = async (needSigner = false) => {
    if (needSigner) {
      const signer = props.provider.getSigner();
      return new Contract(NFT_CONTRACT_ADDRESS, ABI, signer);
    }
    return new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);
  }

  const getTokens = async () => {
    setLoading(true);
    const trazabilidad = await getContract(true);
    const tokens = await trazabilidad.getTokenIds();
    var res = [];

    for (var i = 0; i < tokens.length; i++) {
      var id = tokens[i].toNumber();
      if (id != 0) {
        const attrs = await trazabilidad.obtenerAtributosToken(tokens[i]);
        res.push({
          tokenId: id,
          producto: attrs[1],
          fertilizante: attrs[2],
          lote: attrs[3],
          estado: attrs[4]
        });
      }
    }

    setTokens(res);
    setLoading(false);
  }

  const getState = async (tokenId) => {
    try {
      const trazabilidad = await getContract();
      return await trazabilidad.getState(tokenId);
    } catch (error) {
      console.log(error);
      window.alert("Hay un error obteniendo el estado del token");
    }
  }

  const accept = async (tokenId) => {
    try {
      const trazabilidad = await getContract(true);
      const tx = await trazabilidad.accept(tokenId);
      setSnackbarMessage(`Aceptando token ${tokenId}...`);
      setSnackbarSeverity('info');
      setSnackbarOpen(true);

      setLoading(true);
      await tx.wait();
      setSnackbarMessage(`Token ${tokenId} aceptado exitosamente!`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

    } catch (error) {
      console.log(error);
      window.alert("Hay un error aceptando el token");
    }
  }

  const reject = async (tokenId) => {
    try {
      const trazabilidad = await getContract(true);
      const tx = await trazabilidad.reject(tokenId);

      setLoading(true);
      await tx.wait();

    } catch (error) {
      console.log(error);
      window.alert("Ha habido un error rechazando el token");
    }
  }


  const handleMint = event => {
    event.preventDefault();  
    setPrevIndex(null);
    setSelectedTokenId('');    
  }

 
 const transferTransporte = async () => {
        await getTokens();
         try {
             if (!selectedTokenId) {
                 setSnackbarMessage('Por favor, selecciona un token para transferir.');
                 setSnackbarSeverity('warning');
                 setSnackbarOpen(true);
                 return;
             }
             const trazabilidad = await getContract(true);
             if (!trazabilidad) return;
 
             const tx = await trazabilidad.transferirATransporte(utils.getAddress(transporteAddress), selectedTokenId);
             
             setSnackbarMessage(`Transfiriendo token ${selectedTokenId} al transporte...`);
             setSnackbarSeverity('info');
             setSnackbarOpen(true);
 
             await tx.wait();
             setSnackbarMessage(`Token ${selectedTokenId} transferido al transporte exitosamente!`);
             setSnackbarSeverity('success');
             setSnackbarOpen(true);
             await getTokens(); 
             setSelectedTokenId(''); 
         } catch (error) {
             console.error("Comercio: Error al transferir el token al transporte:", error);
             let errorMessage = "Error desconocido.";
             if (error.code === 4001) {
                 errorMessage = "Transacción rechazada por el usuario en MetaMask.";
             } else if (error.reason) {
                 errorMessage = `Error: ${error.reason}`;
             } else if (error.message) {
                 errorMessage = `Error: ${error.message}`;
             }
             setSnackbarMessage(`Ha habido un error al transferir el token: ${errorMessage}`);
             setSnackbarSeverity('error');
             setSnackbarOpen(true);
         } finally {
             setLoading(false);
         }
     }
     // --- Función para cerrar la Snackbar ---
    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

  const asignarPrecio = async () => {
    try {
      const trazabilidad = await getContract(true);
      const tx = await trazabilidad.putPrecio(selectedTokenId, precioProducto.toString(2));  
      setSnackbarMessage(`Asignando precio al Token ${selectedTokenId}...`);
             setSnackbarSeverity('info');
             setSnackbarOpen(true);   
      await tx.wait();
      setPrecioAsignado(true);
      setSnackbarMessage(`Se asignó precio al Token ${selectedTokenId} exitosamente!`);
             setSnackbarSeverity('success');
             setSnackbarOpen(true);
        await getTokens(); 
      setLoading(true);
      
    } catch (error) {
      console.log(error);
      setSnackbarMessage(`Ha habido un error al asignar precio al token: ${errorMessage}`);
             setSnackbarSeverity('error');
             setSnackbarOpen(true);
    } finally {
        setLoading(false);
        }
  }

  function handlePutOnSale(event) {

      event.preventDefault();

      asignarPrecio();


      setPrevIndex(null);
      setSelectedTokenId('');
      setPrecioProducto('');
    }

  const onClickTokenSelect = (tokenId, index) => {
    if (prevIndex == index) {
      setPrevIndex(null);
      setSelectedTokenId('');
    } else {
      setPrevIndex(index);
      setSelectedTokenId(tokenId);

      getState(tokenId).then(function (estado) {
        if (estado == 0) {
          setIsNew(true);
          setIsAccepted(false);
        } else if (estado == 2) {
          setIsNew(false);
          setIsAccepted(true);
        } else {
          setIsNew(false);
          setIsAccepted(false);
        }
      })
    }
  }

  const translateState = (estado) => {
    switch (estado) {
      case 0:
        return "Nuevo";
      case 1:
        return "Entregado";
      case 2:
        return "Aceptado";
      case 3:
        return "Rechazado";
        case 4:
        return "En Trasporte";
    }
  }

  useEffect(() => {

    const trazabilidad = new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);

    var currentAccount;
    props.provider.send("eth_requestAccounts", []).then(function (result) {
      currentAccount = utils.getAddress(result[0]);
    });

    async function fetchTokens() {
      setLoading(true);
      await getTokens();
    }
    fetchTokens();

    trazabilidad.on(trazabilidad.filters.Transaccion(currentAccount, null, [0, 1, 2, 3, 5]), async (_from, _tokenId, _estado) => {
      setLoading(true);
      await getTokens();
    });

    return () => {
      props.provider.removeAllListeners();
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props])


  return (
    <div>
      <div className={styles.main}>

        <div className={styles.title}>
          <Image width={100} height={100} src="/comercio.png" alt="icono comercio" />
          <h2>Comercio</h2>
        </div>

        <Table striped bordered hover className={styles.table}>
          <thead>
            <tr>
              <th>Selecciona</th>
              <th>Token ID</th>
              <th>Nombre del producto</th>
              <th>Fertilizante</th>
              <th>Lote</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {
              loading ?
                <tr>
                  <td style={{ '--bs-table-accent-bg': 'white', 'textAlign': 'center' }} colSpan='6'>
                    <Image width={100} height={30} src="/loading.gif" alt="loading..." />
                    <p className={styles.p_no_margin}>Cargando, espera unos segundos...</p>
                  </td>
                </tr>
                :
                tokens.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <Form.Check
                        type='radio'
                        id={item.tokenId}
                        value={item.tokenId}
                        name="selectedToken"
                        checked={prevIndex == index}
                        readOnly
                        onClick={event => onClickTokenSelect(event.target.value, index)}
                      />
                    </td>
                    <td>{item.tokenId}</td>
                    <td>{item.producto}</td>
                    <td>{item.lote}</td>
                    <td>{item.fertilizante}</td>
                    <td>
                      {
                        item.estado == 1 ?
                          <div>
                            <Button
                              className={styles.validateButton}
                              variant="primary"
                              value={item.tokenId}
                              onClick={event => accept(event.target.value)}
                            >Acceptar
                            </Button>
                            <Button
                              variant="danger"
                              value={item.tokenId}
                              onClick={event => reject(event.target.value)}
                            >Rechazar
                            </Button>
                          </div>
                          :
                          <p className={styles.p_no_margin}>{translateState(item.estado)}</p>
                      }
                    </td>
                  </tr>
                ))
            }

          </tbody>
        </Table>


        <div className={styles.flexContainer}>
                    
                    <div className={styles.form}>
                        <h4>Asignar precio de venta</h4>
                        
                        <Form onSubmit={handlePutOnSale}>
                            <Form.Group className="mb-3" controlId="precio">
                                <Form.Label>Precio de venta</Form.Label>
                                <Form.Control
                                    type="number"
                                    placeholder="Introduce el precio"
                                    value={precioProducto}
                                    onChange={event => setPrecioProducto(event.target.value)}
                                   
                                    disabled={loading || !selectedTokenId }
                                />
                            </Form.Group>
                            {
                                <Button
                                    variant="primary"
                                    type="submit"
                                    
                                    disabled={ loading || !selectedTokenId || precioProducto == ''}
                                > 
                                    Asignar precio
                                </Button>
                            }
                        </Form>
                    </div>

                    
                    <div className={styles.form}>
                        <h4>Transferir Producto al Transporte</h4>
                        {
                            
                            (() => {
                                const selectedTokenObj = tokens.find(t => t.tokenId === Number(selectedTokenId));
                                if (selectedTokenId && selectedTokenObj && selectedTokenObj.estado === 2) {
                                    
                                    return (
                                        <p>Token seleccionado: <strong>{selectedTokenId}</strong> (Estado: {translateState(selectedTokenObj.estado)})</p>
                                    );
                                } else if (selectedTokenId) {
                                    return (
                                        <p>Selecciona un token <strong>aceptado</strong> para transferir al transporte.</p>
                                    );
                                } else {
                                    return (
                                        <p>Selecciona un token de la tabla.</p>
                                    );
                                }
                            })()
                        }
                        <Button
                            variant="primary" 
                            onClick={transferTransporte}
                            disabled={loading || !selectedTokenId || !precioAsignado}
                        >
                            Transferir al Transporte
                        </Button>
                    </div>
                </div>

            </div>
            
            <Snackbar open={snackbarOpen} autoHideDuration={8000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%', zIndex: 9999 }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>

        </div>
    )
}