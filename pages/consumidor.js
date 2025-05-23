import { Contract, utils } from "ethers";
import React, { useEffect, useState } from "react";
import { NFT_CONTRACT_ADDRESS, ABI } from "../constants";
// Estilos HTML
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Image from 'next/image';
import styles from "../styles/Home.module.css";
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import Card from './card';

import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

// Componente Alert personalizado para Snackbar (para usar el Alert de MUI)
const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Consumidor(props) {

  // variables related to tables
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [loadingBought, setLoadingBought] = useState(false);
  const [tokensAvailable, setTokensIdsAvailable] = useState([]);
  const [tokensBought, setTokensIdsBought] = useState([]);
  const [prevIndex, setPrevIndex] = useState(null);
  const [selectedTokenId, setSelectedTokenId] = useState('');
  // variables related to history
  const [boxCards, setBoxCards] = useState(null);
  const [cards, setCards] = useState([]);
  const [uniqueTokenIds, setUniqueTokenIds] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // --- Estado para la Snackbar/Alert de MUI ---
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // 'success', 'info', 'warning', 'error' 

  var visitedMint = false;

  // --- Función para cerrar la Snackbar ---
    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };
    // --- Fin de Función para cerrar la Snackbar ---

  const getContract = async (needSigner = false) => {
    if (needSigner) {
      const signer = props.provider.getSigner();      
      return new Contract(NFT_CONTRACT_ADDRESS, ABI, signer);
    }
    return new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);
  }

  const getTokens = async (alsoBought = false) => {
    const trazabilidad = await getContract();
    const tokens = await trazabilidad.connect(NFT_CONTRACT_ADDRESS).getTokenIds();
    const tokensAvailable = await getAttrs([], trazabilidad, tokens, false);
    setTokensIdsAvailable(tokensAvailable);
    setLoadingAvailable(false);

    if (alsoBought) {
      const trazabilidad = await getContract(true);
      const tokens = await trazabilidad.getTokenIds();
      const tokensBought = await getAttrs([], trazabilidad, tokens, alsoBought);
      setTokensIdsBought(tokensBought);
      setLoadingBought(false);
    }
  }

  const getAttrs = async (aux, trazabilidad, tokens, bought) => {
    for (var i = 0; i < tokens.length; i++) {
      var id = tokens[i].toNumber();
      if (id != 0) {
        const attrs = await trazabilidad.obtenerAtributosToken(tokens[i]);
        if (bought) {
          aux.push({ tokenId: id, producto: attrs[1], fertilizante: attrs[3], lote: attrs[2], estado: attrs[5] });
        } else {
          
          const price = utils.formatEther(await getPrice(id));
          aux.push({ tokenId: id, producto: attrs[1], fertilizante: attrs[3], lote: attrs[2], estado: attrs[5], precio: price*1000000000000000000 });
        }
      }
    }
    return aux;
  }

  const getPrice = async (tokenId) => {
    try {
      const trazabilidad = await getContract();
      return await trazabilidad.getPrice(tokenId);
    } catch (error) {
      console.log(error);
      window.alert("Hay un error obteniendo el precio del token");
    }
  }

  const buy = async (tokenId) => {
    try {
      const trazabilidad = await getContract(true);
      const price = await trazabilidad.getPrice(tokenId);
      const tx = await trazabilidad.buy(tokenId, { value: price });
      setSnackbarMessage(`Comprando el token: ${tokenId}`);
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      setLoadingAvailable(true);
      setLoadingBought(true);
      await tx.wait();
      setSnackbarMessage(`Ha comprado el token: ${tokenId}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.log(error);
      setSnackbarMessage(`Ha habido un error comprando el token: ${tokenId}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }

  const getHistory = async (arrayCards, events, pos, order) => {

    try {

      const trazabilidad = await getContract();
      const event = events[pos];
      //console.log(event);
      const user = await trazabilidad.obtenerInformacionUsuario(event.args._desde);
      
      const completeData = {
        operation: event.args._estado,
        tokenId: event.args._tokenId,
        blockTimestamp: (await event.getBlock(event.blockNumber)).timestamp * 1000,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash
      }



        const attrs = await trazabilidad.obtenerAtributosToken(Number(event.args._tokenId));

        
          if (selectedTokenId == event.args._tokenId) {
            visitedMint = true;
          }
                  
        completeData.attrs = { fertilizante: attrs[3], producto: attrs[2], lote: attrs[1], currentState: attrs[4] };
        completeData.user = { nombre: user[0], role: user[1] };
        
        
      const price = await trazabilidad.getPrice(event.args._tokenId);
      const temperatura = await trazabilidad.obtenerTemperatura(event.args._tokenId);
      completeData.precio = parseInt(price.toString(10));
      
      completeData.temperaturaMin = temperatura[0];
      completeData.temperaturaMax = temperatura[1];
      if (pos == events.length - 1) {
        uniqueTokenIds.push(Number(event.args._tokenId));
        arrayCards.push(<Card key={order} data={completeData} />);

        if (visitedMint) {
          setCards(arrayCards);
        }
        return arrayCards;
      }

      arrayCards.push(<Card key={order} data={completeData} />);
      await getHistory(arrayCards, events, pos + 1, order + 1);

    } catch (error) {
      console.log(error);
      window.alert("Hay un error al obtener el historial");
    }
  }

  const showCards = () => {
    const tokenIds = uniqueTokenIds.reverse();
    var htmlElement = [];

    for (var i = 0; i < tokenIds.length; i++) {
      htmlElement.push(
        <Box key={i} className={styles.boxCustomer}>
          <h4 style={{ 'textAlign': 'center' }}>Token {tokenIds[i]}</h4>
          <hr style={{ 'marginBottom': '5%', 'marginTop': '0%' }}></hr>
          <Grid container direction="column">
            {cards.sort((a, b) => a.key > b.key ? 1 : -1).map((card, index) => (
             
                <Grid item key={index} width="100%">{card}</Grid>
             
            ))
            }
          </Grid>
        </Box>
      )
    }
    setUniqueTokenIds([]);
    return htmlElement;
  }

  const onClickTokenSelect = (tokenId, index) => {
    if (prevIndex == index) {
      setPrevIndex(null);
      setSelectedTokenId('');
      setBoxCards(null);
    } else {
      setPrevIndex(index);
      setSelectedTokenId(tokenId);
    }
  }

  useEffect(() => {

    const trazabilidad = new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);

    var currentAccount;
    props.provider.send("eth_requestAccounts", []).then(function (result) {
      currentAccount = utils.getAddress(result[0]);
    });

    async function fetchTokens() {
      setLoadingAvailable(true);
      setLoadingBought(true);
      await getTokens(true);
    }
    fetchTokens();

    trazabilidad.on(trazabilidad.filters.Transaccion(null, null, [5]), async (_from, _tokenId, _state) => {
      setLoadingAvailable(true);
      await getTokens();
    });

    trazabilidad.on(trazabilidad.filters.Transaccion(currentAccount, null, [6]), async (_from, _tokenId, _state) => {
      setLoadingAvailable(true);
      setLoadingBought(true);
      await getTokens(true);
    });

    return () => {
      props.provider.removeAllListeners();
    }

  }, [props])

  useEffect(() => {

    async function fetchHistory() {
      if (selectedTokenId != '') {
        const trazabilidad = await getContract();
        const filter = trazabilidad.filters.Transaccion(null, Number(selectedTokenId), null);
        const events = await trazabilidad.queryFilter(filter, 0, 'latest');
        setCards([]);
        setLoadingHistory(true);
        getHistory([], events, 0, 0);
      }
    }
    fetchHistory();

  }, [selectedTokenId])

  useEffect(() => {
    if (cards.length != 0) {
      const htmlElement = showCards();
      setLoadingHistory(false);
      setBoxCards(htmlElement);
    }
  }, [cards])


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
              <th>Precio</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {
              loadingAvailable ?
                <tr>
                  <td style={{ '--bs-table-accent-bg': 'white', 'textAlign': 'center' }} colSpan='7'>
                    <Image width={100} height={30} src="/loading.gif" alt="cargando.." />
                    <p className={styles.p_no_margin}>Cargando, espere unos segunods..</p>
                  </td>
                </tr>
                :
                tokensAvailable.map((item, index) => (
                  <tr key={"available_" + index}>
                    <td>
                      {
                        <Form.Check
                          type='radio'
                          id={item.tokenId}
                          value={item.tokenId}
                          name="selectedToken"
                          checked={prevIndex == "available_" + index}
                          readOnly
                          onClick={event => onClickTokenSelect(event.target.value, "available_" + index)}
                        />
                      }
                    </td>
                    <td>{item.tokenId}</td>
                    <td>{item.producto}</td>
                    <td>{item.fertilizante}</td>
                    <td>{item.lote}</td>
                    <td>{item.precio}</td>
                    <td>
                      <Button value={item.tokenId} variant="primary" onClick={event => buy(event.target.value)}>
                        Comprar
                      </Button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </Table>

        <h3>Mis productos comprados</h3>
        <hr className={styles.hrCustomer}></hr>
        <Table striped bordered hover className={styles.table}>
          <thead>
            <tr>
              <th>Ver historial</th>
              <th>Token ID</th>
              <th>Producto</th>
              <th>Fertilizante</th>
              <th>Lote</th>
            </tr>
          </thead>
          <tbody>
            {
              loadingBought ?
                <tr>
                  <td style={{ '--bs-table-accent-bg': 'white', 'textAlign': 'center' }} colSpan='6'>
                    <Image width={100} height={30} src="/loading.gif" alt="cargando..." />
                    <p className={styles.p_no_margin}>Cargando, espera unos segundos...</p>
                  </td>
                </tr>
                :
                tokensBought.map((item, index) => (
                  <tr key={"bought_" + index}>
                    <td>
                      {
                        <Form.Check
                          type='radio'
                          id={item.tokenId}
                          value={item.tokenId}
                          name="selectedToken"
                          checked={prevIndex == "bought_" + index}
                          readOnly
                          onClick={event => onClickTokenSelect(event.target.value, "bought_" + index)}
                        />
                      }
                    </td>
                    <td>{item.tokenId}</td>
                    <td>{item.producto}</td>
                    <td>{item.fertilizante}</td>
                    <td>{item.lote}</td>
                  </tr>
                ))}
          </tbody>
        </Table>

        <h3 style={{ 'textAlign': 'center', 'paddingTop': '2%' }}>Historial</h3>
        {
          selectedTokenId != '' ?
            <div className={styles.flexContainerHistory}>
              {loadingHistory ?
                <div style={{ 'textAlign': 'center' }}>
                  <Image width={100} height={30} src="/loading.gif" alt="cargando..." />
                  <p className={styles.p_no_margin}>Cargando, espera unos segunods...</p>
                </div>
                :
                boxCards
              }
            </div>
            :
            <p className={styles.p_no_history}>No hay producros seleccionados</p>
        }

      </div>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%', zIndex: 9999 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  )
}
