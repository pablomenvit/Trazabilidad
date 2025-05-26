import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
 
import { Button } from 'react-bootstrap'; 
import { styled } from '@mui/material/styles';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useState } from "react"; 

export default function Card(props) {
const [isCopied, setIsCopied] = useState(false);

const Item = styled(Paper)(({ theme }) => ({
display: 'flex',
marginBottom: '8%',
flexDirection: 'column',
textAlign: 'center',
paddingTop: theme.spacing(1),
paddingBottom: theme.spacing(1),
paddingLeft: theme.spacing(3),
...theme.typography.body2,
color: theme.palette.text.secondary,
backgroundColor: theme.palette.mode === 'dark' ? '#fff' : '#0d3b66',
}));

const Title = styled('div')(({ theme }) => ({
...theme.typography.button,
...theme.typography.h6,
color: '#fff',
fontWeight: 550,
padding: theme.spacing(1),
textAlign: 'center',
}));

const getMyDate = (date) => {
const myDate = new Date(parseInt(date));
return (
myDate.getDate() +
"/" + (myDate.getMonth() + 1) +
"/" + myDate.getFullYear() +
" " + myDate.getHours() +
":" + myDate.getMinutes() +
":" + myDate.getSeconds()
);
};

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
};

const translateRole = (role) => {
switch (role) {
case 0: return "Agricultor";
case 1: return "Comercio";
case 2: return "Transporte";
case 3: return "Consumidor";
default: return "Desconocido";
}
};

const calculaReparto = (precioV) => {
return {
agricultor: precioV * 0.35,
comercio: precioV * 0.5,
transporte: precioV * 0.15,
};
};

const handleCopyClick = () => {
setIsCopied(true);
setTimeout(() => {
setIsCopied(false);
}, 1500);
};

// ✅ Validación para evitar errores de prerender
if (!props.data || !props.data.txHash) {
return (
<Typography variant="h6" color="error" style={{ textAlign: 'center', marginTop: '2rem' }}>
No hay información disponible para mostrar la tarjeta.
</Typography>
);
}

const tokenData = props.data;
const miURL = "https://sepolia.etherscan.io/tx/" + tokenData.txHash;

return (
<Item>
<Title>
{translateState(tokenData.operation)}
</Title>

<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Fecha:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;{getMyDate(tokenData.blockTimestamp)}
</Typography>
</div>

{tokenData.operation === 0 ? (
<>
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Producto:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;{tokenData.attrs.producto}
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;&nbsp;&nbsp;<strong>Fertilizante:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;{tokenData.attrs.fertilizante}
</Typography>
</div>
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Lote Nº:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;{tokenData.attrs.lote}
</Typography>
</div>
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Entidad:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;{tokenData.user.nombre}, &nbsp;&nbsp;&nbsp;{translateRole(tokenData.user.role)}
</Typography>
</div>
</>
) : tokenData.operation === 2 ? (
<>
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Entidad:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;{tokenData.user.nombre}, &nbsp;&nbsp;&nbsp;{translateRole(tokenData.user.role)}
</Typography>
</div>
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Precio establecido:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;{tokenData.precio} €
</Typography>
</div>
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Repartido de la siguiente manera:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;&nbsp;<strong>Agricultor</strong> &nbsp;{(calculaReparto(tokenData.precio).agricultor).toFixed(2)} €
&nbsp;&nbsp;<strong>Transporte</strong> &nbsp;{(calculaReparto(tokenData.precio).transporte).toFixed(2)} €
&nbsp;&nbsp;<strong>Comercio</strong> &nbsp;{(calculaReparto(tokenData.precio).comercio).toFixed(2)} €
</Typography>
</div>
</>
) : tokenData.operation === 3 ? (
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Rechazado por:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;{tokenData.user.nombre}, &nbsp;&nbsp;&nbsp;{translateRole(tokenData.user.role)}
</Typography>
</div>
) : tokenData.operation === 4 ? (
<>
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Entidad:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;{tokenData.user.nombre}, &nbsp;&nbsp;&nbsp;{translateRole(tokenData.user.role)}
</Typography>
</div>
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Se ha transportado entre una temperatura de:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;&nbsp;{tokenData.temperaturaMin}&nbsp;ºC
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;&nbsp;<strong> y de:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;&nbsp;{tokenData.temperaturaMax}&nbsp;ºC
</Typography>
</div>
</>
) : tokenData.operation === 5 ? (
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Producto ofrecido al mercado</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;&nbsp;{tokenData.attrs.lote}
</Typography>
</div>
) : tokenData.operation === 6 ? (
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Comprado por:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;&nbsp;{tokenData.user.nombre}
</Typography>
</div>
) : (
<div style={{ display: "flex" }}>
<Typography variant="subtitle1" color="white" noWrap>
<strong>Entregado a:</strong>
</Typography>
<Typography variant="subtitle1" color="white" noWrap>
&nbsp;&nbsp;{tokenData.user.nombre}
</Typography>
</div>
)}

<Grid>
<Typography variant="h6" color="white" component="p">
Información de la transacción
</Typography>
<Typography variant="body2" color="white" component="p">
Número de bloque: {tokenData.blockNumber}
</Typography>
<CopyToClipboard text={tokenData.txHash} onCopy={handleCopyClick}>
<Button style={{ 'marginTop': '2%', 'marginBottom': '2%' }} variant="primary">
<Typography variant="body2" color="white" component="p">
{isCopied ? '¡Copiado!' : 'Copiar Hash'}
</Typography>
</Button>
</CopyToClipboard>
&nbsp;&nbsp;
<Button
style={{ 'marginTop': '2%', 'marginBottom': '2%' }}
variant="primary"
href={miURL}
target="_blank"
rel="noopener noreferrer"
>
<Typography variant="body2" color="white" component="p">
{'Ver en Etherscan'}
</Typography>
</Button>
</Grid>
</Item>
);
}