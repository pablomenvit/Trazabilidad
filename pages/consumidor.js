import { Contract, utils, BigNumber } from "ethers";
import React, { useEffect, useState } from "react";
import { NFT_CONTRACT_ADDRESS, ABI } from "../constants";
// Estilos
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

// Componente Alert personalizado para Snackbar
const Alert = React.forwardRef(function Alert(props, ref) {
return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Consumidor(props) {

const [loadingAvailable, setLoadingAvailable] = useState(false);
const [loadingBought, setLoadingBought] = useState(false);
const [tokensAvailable, setTokensIdsAvailable] = useState([]);
const [tokensBought, setTokensIdsBought] = useState([]);
const [prevIndex, setPrevIndex] = useState(null);
const [selectedTokenId, setSelectedTokenId] = useState('');

const [boxCards, setBoxCards] = useState(null);
const [cards, setCards] = useState([]);
const [uniqueTokenIds, setUniqueTokenIds] = useState([]);
const [loadingHistory, setLoadingHistory] = useState(false);

const [snackbarOpen, setSnackbarOpen] = useState(false);
const [snackbarMessage, setSnackbarMessage] = useState('');
const [snackbarSeverity, setSnackbarSeverity] = useState('success');
const [snackbarAutoCloseDuration, setSnackbarAutoCloseDuration] = useState(6000); 

const [agricultorDelToken, setAgricultorDelToken] = useState('');
const [agricultorBalance, setAgricultorBalance] = useState('');
const [comercioDireccion, setComercioDireccion] = useState('');
const [comercioBalance, setComercioBalance] = useState('');
const [transporteDireccion, setTransporteDireccion] = useState('');
const [transporteBalance, setTransporteBalance] = useState('');
const [precioTokenWei, setPrecioTokenWei] = useState(BigNumber.from(0));
const [precioTokenEth, setPrecioTokenEth] = useState('0');

var visitedMint = false;

const handleCloseSnackbar = (event, reason) => {
if (reason === 'clickaway') {
return;
}
setSnackbarOpen(false);
};

const getContract = async (needSigner = false) => {
if (needSigner) {
const signer = props.provider.getSigner();
return new Contract(NFT_CONTRACT_ADDRESS, ABI, signer);
}
return new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);
}

const getTokens = async (alsoBought = false) => {
const trazabilidad = await getContract();
const tokensAvailableIds = await trazabilidad.getTokenIdsOnSale();
const availableAttrs = await getAttrs([], trazabilidad, tokensAvailableIds, false);
setTokensIdsAvailable(availableAttrs);
setLoadingAvailable(false);

if (alsoBought) {
const currentAccount = await props.provider.send("eth_requestAccounts", []).then(result => utils.getAddress(result[0]));
const trazabilidadWithSigner = await getContract(true);
const tokensBoughtIds = await trazabilidadWithSigner.getTokenIds();
const boughtAttrs = await getAttrs([], trazabilidadWithSigner, tokensBoughtIds, true);
setTokensIdsBought(boughtAttrs);
setLoadingBought(false);
}
}

const getAttrs = async (aux, trazabilidad, tokens, bought) => {
for (let i = 0; i < tokens.length; i++) {
const id = tokens[i].toNumber();
if (id !== 0) {
const attrs = await trazabilidad.obtenerAtributosToken(tokens[i]);
const estado = attrs[4];


if (bought) {
if (estado === 6) { 
aux.push({ tokenId: id, producto: attrs[1], fertilizante: attrs[3], lote: attrs[2], estado: estado });
}
} else {
if (estado === 5) { 
    console.log(tokensAvailable);
const priceWei = await trazabilidad.getPrice(id);
const precioEUR = priceWei * 10 /10;
aux.push({
tokenId: id,
producto: attrs[1],
fertilizante: attrs[3],
lote: attrs[2],
estado: estado,
precio: precioEUR, 
precioWei: priceWei, // Precio en Wei 
creadoPor: attrs[0]
});
}
}
}
}
return aux;
}

/// --- Obtener y mostrar balances de las cuentas ---
const fetchAndDisplayBalances = async (tokenId) => {
const trazabilidadNoSigner = await getContract(false);

try {
let creadorDelToken = '';
const selectedToken = tokensAvailable.find(t => t.tokenId === Number(tokenId));
if (selectedToken) {
creadorDelToken = selectedToken.creadoPor;
setAgricultorDelToken(creadorDelToken);
} else {

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
}


const handleBuyToken = async () => {
try {
if (!selectedTokenId) {
setSnackbarMessage('Por favor, selecciona un token para comprar.');
setSnackbarSeverity('warning');
setSnackbarAutoCloseDuration(4000); 
setSnackbarOpen(true);
return;
}

const selectedToken = tokensAvailable.find(t => t.tokenId === Number(selectedTokenId));
if (!selectedToken || selectedToken.estado !== 5) { 
setSnackbarMessage('El token seleccionado no está en venta.');
setSnackbarSeverity('warning');
setSnackbarAutoCloseDuration(4000);
setSnackbarOpen(true);
return;
}

setSnackbarMessage('Obteniendo balances actuales...');
setSnackbarSeverity('info');
setSnackbarAutoCloseDuration(3000); 
setSnackbarOpen(true);
await fetchAndDisplayBalances(selectedTokenId);


setLoadingAvailable(true);
setLoadingBought(true);
const trazabilidad = await getContract(true);

const precioAPagar = selectedToken.precioWei; 
      
setSnackbarMessage(`Enviando transacción de compra por ${precioAPagar} ETH...`);
setSnackbarSeverity('info');
setSnackbarAutoCloseDuration(7000); 
setSnackbarOpen(true);

const tx = await trazabilidad.buy(selectedTokenId, { value: precioAPagar });

setSnackbarMessage(`Transacción enviada. Esperando confirmación... Hash: ${tx.hash}`);
setSnackbarSeverity('info');
setSnackbarAutoCloseDuration(8000); 
setSnackbarOpen(true);

const receipt = await tx.wait();

if (receipt.status === 1) {

setSnackbarMessage(`¡Token ${selectedTokenId} comprado exitosamente! Actualizando balances...`);
setSnackbarSeverity('success');
setSnackbarAutoCloseDuration(8000); 
setSnackbarOpen(true);


await fetchAndDisplayBalances(selectedTokenId);

setSnackbarMessage('Actualizando tablas de productos...');
setSnackbarSeverity('info');
setSnackbarAutoCloseDuration(2000);
setSnackbarOpen(true);
await getTokens(true); 
setSelectedTokenId('');
setPrevIndex(null);
setPrecioTokenWei(BigNumber.from(0));
setPrecioTokenEth('0');
setSnackbarOpen(false); 

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
if (error.code === 4001) {
errorMessage = "Transacción rechazada por el usuario en MetaMask.";
} else if (error.reason) {
errorMessage = `Error de contrato: ${error.reason}`;
} else if (error.message) {
errorMessage = `Error: ${error.message}`;
}
setSnackbarMessage(`Ha habido un error al comprar el token: ${errorMessage}`);
setSnackbarSeverity('error');
setSnackbarAutoCloseDuration(6000);
setSnackbarOpen(true);
} finally {
setLoadingAvailable(false);
setLoadingBought(false);
}
};


const getHistory = async (arrayCards, events, pos, order) => {
try {
const trazabilidad = await getContract();
const event = events[pos];

const user = await trazabilidad.obtenerInformacionUsuario(event.args._desde);

const completeData = {
operation: event.args._estado,
tokenId: event.args._tokenId,
blockTimestamp: (await event.getBlock(event.blockNumber)).timestamp * 1000,
blockNumber: event.blockNumber,
txHash: event.transactionHash
}

const attrs = await trazabilidad.obtenerAtributosToken(Number(event.args._tokenId));

if (selectedTokenId === event.args._tokenId.toString()) { 
visitedMint = true;
}

completeData.attrs = { fertilizante: attrs[3], producto: attrs[1], lote: attrs[2], currentState: attrs[4] };
completeData.user = { nombre: user[0], role: user[1] };


const price = await trazabilidad.getPrice(event.args._tokenId);
const temperatura = await trazabilidad.obtenerTemperatura(event.args._tokenId);
            completeData.precio = parseInt(price.toString());
            completeData.precio = parseInt(price.toString());

completeData.temperaturaMin = temperatura[0];
completeData.temperaturaMax = temperatura[1];
if (pos === events.length - 1) {
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
setSnackbarMessage("Hay un error al obtener el historial");
setSnackbarSeverity('error');
setSnackbarAutoCloseDuration(7000);
setSnackbarOpen(true);
}
}

const showCards = () => {
const tokenIds = uniqueTokenIds.reverse();
const htmlElement = [];

for (let i = 0; i < tokenIds.length; i++) {
htmlElement.push(
<Box key={i} className={styles.boxCustomer}>
<h4 style={{ 'textAlign': 'center' }}>Token {tokenIds[i]}</h4>
<hr style={{ 'marginBottom': '5%', 'marginTop': '0%' }}></hr>
<Grid container direction="column">
{cards.sort((a, b) => a.key > b.key ? 1 : -1).map((card, index) => (
<Grid item key={index} width="100%">{card}</Grid>
))}
</Grid>
</Box>
)
}
setUniqueTokenIds([]); // Limpia uniqueTokenIds después de usarlos
return htmlElement;
}

const onClickTokenSelect = (tokenId, index) => {
if (prevIndex === index) {
setPrevIndex(null);
setSelectedTokenId('');
setBoxCards(null);
setAgricultorDelToken('');
setAgricultorBalance('');
setComercioDireccion('');
setComercioBalance('');
setTransporteDireccion('');
setTransporteBalance('');
setPrecioTokenWei(BigNumber.from(0));
setPrecioTokenEth('0');
} else {
setPrevIndex(index);
setSelectedTokenId(tokenId);
fetchAndDisplayBalances(tokenId);
}
}

const translateState = (estado) => {
switch (estado) {
case 0: return "Nuevo";
case 1: return "Entregado";
case 2: return "Aceptado";
case 3: return "Rechazado";
case 4: return "En Transporte";
case 5: return "En Venta";
case 6: return "Comprado";
default: return "Desconocido";
}
}

useEffect(() => {
const initContractAndListeners = async () => {
const trazabilidad = new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);

async function fetchInitialData() {
setLoadingAvailable(true);
setLoadingBought(true);
await getTokens(true);

if (trazabilidad) {
try {
const comercioAddr = await trazabilidad.comercioAddress();
const transporteAddr = await trazabilidad.transporteAddress();
setComercioDireccion(comercioAddr);
setTransporteDireccion(transporteAddr);
} catch (err) {
console.error("Error al obtener direcciones de Comercio/Transporte:", err);
}
}
}
fetchInitialData();


trazabilidad.on(trazabilidad.filters.Transaccion(null, null, 5), async (_from, _tokenId, _state) => {
setSnackbarMessage('Detectado nuevo token en venta. Actualizando lista...');
setSnackbarSeverity('info');
setSnackbarAutoCloseDuration(3000);
setSnackbarOpen(true);
setLoadingAvailable(true);
await getTokens();
});



let currentAccount;
if (props.provider) {
const accounts = await props.provider.send("eth_requestAccounts", []);
currentAccount = utils.getAddress(accounts[0]);
}
trazabilidad.on(trazabilidad.filters.Transaccion(currentAccount, null, 6), async (_from, _tokenId, _state) => {
setSnackbarMessage(`Evento "Token Comprado" recibido para Token ${_tokenId.toNumber()}`);
setSnackbarSeverity('info');
setSnackbarAutoCloseDuration(3000);
setSnackbarOpen(true);
setLoadingAvailable(true);
setLoadingBought(true);
await getTokens(true);
});

return () => {
trazabilidad.removeAllListeners();
}
};

if (props.provider) {
initContractAndListeners();
}
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [props.provider]); 


useEffect(() => {
async function fetchHistory() {
if (selectedTokenId !== '') {
const trazabilidad = await getContract();
const filter = trazabilidad.filters.Transaccion(null, Number(selectedTokenId), null);
const events = await trazabilidad.queryFilter(filter, 0, 'latest');
setCards([]);
setLoadingHistory(true);
await getHistory([], events, 0, 0); // Esperar a que getHistory termine
}
}
fetchHistory();

// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedTokenId]); 

useEffect(() => {
if (cards.length !== 0) {
const htmlElement = showCards();
setLoadingHistory(false);
setBoxCards(htmlElement);
}
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [cards]); 

// Calcular los pagos esperados
const expectedAgricultorPayment = precioTokenWei.isZero() ? '0' : utils.formatEther(precioTokenWei.mul(35).div(100));
const expectedComercioPayment = precioTokenWei.isZero() ? '0' : utils.formatEther(precioTokenWei.mul(50).div(100));
const expectedTransportePayment = precioTokenWei.isZero() ? '0' : utils.formatEther(precioTokenWei.mul(15).div(100));


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
<th>Accion</th>
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
tokensAvailable.map((item, index) => (
<tr key={"available_" + item.tokenId}>
<td>
{
<Form.Check
type='radio'
id={`token-${item.tokenId}`}
value={item.tokenId}
name="selectedToken"
checked={selectedTokenId === String(item.tokenId)} 
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
<Button
value={item.tokenId}
variant="primary"
onClick={handleBuyToken}
disabled={loadingAvailable || loadingBought || selectedTokenId !== String(item.tokenId) || item.estado !== 5}
>
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
<tr key={"bought_" + item.tokenId}>
<td>
{
<Form.Check
type='radio'
id={item.tokenId}
value={item.tokenId}
name="selectedToken"
checked={selectedTokenId === String(item.tokenId)}
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
selectedTokenId !== '' ?
<div className={styles.flexContainerHistory}>
{loadingHistory ?
<div style={{ 'textAlign': 'center' }}>
<Image width={100} height={30} src="/loading.gif" alt="cargando..." />
<p className={styles.p_no_margin}>Cargando, espera unos segundos...</p>
</div>
:
boxCards
}
</div>
:
<p className={styles.p_no_history}>No hay productos seleccionados</p>
}

</div>
{selectedTokenId && selectedAvailableTokenObj && selectedAvailableTokenObj.estado === 5 && (
<div className={styles.form} style={{ width: 'fit-content', margin: 'auto', marginBottom: '20px', border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
<h4>Demostración de Pagos del Token {selectedTokenId}</h4>
<p>Precio total de compra: <strong>{precioTokenEth} ETH</strong></p>
<p>
Pago esperado: <br />
Agricultor ({agricultorDelToken.substring(0, 6)}...): <strong>{expectedAgricultorPayment} ETH</strong> (35%)<br />
Comercio ({comercioDireccion.substring(0, 6)}...): <strong>{expectedComercioPayment} ETH</strong> (50%)<br />
Transporte ({transporteDireccion.substring(0, 6)}...): <strong>{expectedTransportePayment} ETH</strong> (15%)
</p>
<hr />
<h5>Balances Actuales de los Destinatarios:</h5>
<p>Agricultor ({agricultorDelToken.substring(0, 6)}...): <strong>{agricultorBalance} ETH</strong></p>
<p>Comercio ({comercioDireccion.substring(0, 6)}...): <strong>{comercioBalance} ETH</strong></p>
<p>Transporte ({transporteDireccion.substring(0, 6)}...): <strong>{transporteBalance} ETH</strong></p>
<p style={{ marginTop: '10px', fontSize: '0.9em', color: '#555' }}>
*Los balances se actualizarán automáticamente después de una compra exitosa.
</p>
</div>
)}
<Snackbar open={snackbarOpen} autoHideDuration={snackbarAutoCloseDuration} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
<Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%', zIndex: 9999 }}>
{snackbarMessage}
</Alert>
</Snackbar>
</div>
);
}
