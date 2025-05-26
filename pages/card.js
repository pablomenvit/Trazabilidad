import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Button } from 'react-bootstrap'; // Importación correcta para Button de react-bootstrap
import { experimentalStyled as styled } from '@mui/material/styles';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useState } from "react";

// Las definiciones de los componentes 'styled' se mueven fuera del componente funcional
// Esto evita que se redefinan en cada renderizado, mejorando el rendimiento.
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

export default function Card(props) {
  const [isCopied, setIsCopied] = useState(false);

  // Validación robusta para los datos esenciales de la tarjeta.
  // Si falta información crucial como txHash, operation o blockTimestamp,
  // se muestra un mensaje de error para evitar fallos.
  if (!props.data || !props.data.txHash || !props.data.operation || !props.data.blockTimestamp) {
    // console.warn("El componente Card recibió datos incompletos:", props.data); // Útil para depuración
    return (
      <Typography variant="h6" color="error" style={{ textAlign: 'center', marginTop: '2rem' }}>
        No hay información disponible para mostrar la tarjeta.
      </Typography>
    );
  }

  const tokenData = props.data;
  const miURL = `https://sepolia.etherscan.io/tx/${tokenData.txHash}`;

  // Función para formatear la fecha y hora.
  // Se asegura de que los minutos y segundos tengan siempre dos dígitos.
  const getMyDate = (date) => {
    const myDate = new Date(parseInt(date));
    return (
      `${myDate.getDate()}/${myDate.getMonth() + 1}/${myDate.getFullYear()} ${myDate.getHours()}:${String(myDate.getMinutes()).padStart(2, '0')}:${String(myDate.getSeconds()).padStart(2, '0')}`
    );
  };

  // Función para traducir el estado numérico de la operación a una cadena legible.
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

  // Función para traducir el rol numérico del usuario a una cadena legible.
  const translateRole = (role) => {
    switch (role) {
      case 0: return "Agricultor";
      case 1: return "Comercio";
      case 2: return "Transporte";
      case 3: return "Consumidor";
      default: return "Desconocido";
    }
  };

  // Función para calcular el reparto del precio de venta entre las partes.
  // Se asegura de que 'precioV' sea un número antes de realizar cálculos.
  const calculaReparto = (precioV) => {
    const price = Number(precioV) || 0; // Si precioV no es un número válido, usa 0
    return {
      agricultor: price * 0.35,
      comercio: price * 0.5,
      transporte: price * 0.15,
    };
  };

  // Manejador para el botón de copiar. Establece un estado temporal 'isCopied'.
  const handleCopyClick = () => {
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 1500); // El mensaje "¡Copiado!" desaparece después de 1.5 segundos
  };

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

      {/* Renderizado condicional basado en el tipo de operación (estado del token).
          Se utiliza el encadenamiento opcional (?. ) y los valores por defecto (|| 'N/A')
          para manejar de forma segura las propiedades anidadas que podrían no existir. */}
      {tokenData.operation === 0 ? (
        <>
          <div style={{ display: "flex" }}>
            <Typography variant="subtitle1" color="white" noWrap>
              <strong>Producto:</strong>
            </Typography>
            <Typography variant="subtitle1" color="white" noWrap>
              &nbsp;{tokenData.attrs?.lote || 'N/A'} {/* Acceso seguro a tokenData.attrs.lote */}
            </Typography>
            <Typography variant="subtitle1" color="white" noWrap>
              &nbsp;&nbsp;&nbsp;<strong>Fertilizante:</strong>
            </Typography>
            <Typography variant="subtitle1" color="white" noWrap>
              &nbsp;{tokenData.attrs?.fertilizante || 'N/A'} {/* Acceso seguro */}
            </Typography>
          </div>
          <div style={{ display: "flex" }}>
            <Typography variant="subtitle1" color="white" noWrap>
              <strong>Lote Nº:</strong>
            </Typography>
            <Typography variant="subtitle1" color="white" noWrap>
              &nbsp;{tokenData.attrs?.producto || 'N/A'} {/* Acceso seguro */}
            </Typography>
          </div>
          <div style={{ display: "flex" }}>
            <Typography variant="subtitle1" color="white" noWrap>
              <strong>Entidad:</strong>
            </Typography>
            <Typography variant="subtitle1" color="white" noWrap>
              &nbsp;{tokenData.user?.nombre || 'N/A'}, &nbsp;&nbsp;&nbsp;{translateRole(tokenData.user?.role) || 'N/A'} {/* Acceso seguro */}
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
              &nbsp;{tokenData.user?.nombre || 'N/A'}, &nbsp;&nbsp;&nbsp;{translateRole(tokenData.user?.role) || 'N/A'}
            </Typography>
          </div>
          <div style={{ display: "flex" }}>
            <Typography variant="subtitle1" color="white" noWrap>
              <strong>Precio establecido:</strong>
            </Typography>
            <Typography variant="subtitle1" color="white" noWrap>
              &nbsp;{tokenData.precio || '0'} € {/* Si no hay precio, muestra '0' */}
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
            &nbsp;{tokenData.user?.nombre || 'N/A'}, &nbsp;&nbsp;&nbsp;{translateRole(tokenData.user?.role) || 'N/A'}
          </Typography>
        </div>
      ) : tokenData.operation === 4 ? (
        <>
          <div style={{ display: "flex" }}>
            <Typography variant="subtitle1" color="white" noWrap>
              <strong>Entidad:</strong>
            </Typography>
            <Typography variant="subtitle1" color="white" noWrap>
              &nbsp;{tokenData.user?.nombre || 'N/A'}, &nbsp;&nbsp;&nbsp;{translateRole(tokenData.user?.role) || 'N/A'}
            </Typography>
          </div>
          <div style={{ display: "flex" }}>
            <Typography variant="subtitle1" color="white" noWrap>
              <strong>Se ha transportado entre una temperatura de:</strong>
            </Typography>
            <Typography variant="subtitle1" color="white" noWrap>
              &nbsp;&nbsp;{tokenData.temperaturaMin || 'N/A'}&nbsp;ºC {/* Acceso seguro */}
            </Typography>
            <Typography variant="subtitle1" color="white" noWrap>
              &nbsp;&nbsp;<strong> y de:</strong>
            </Typography>
            <Typography variant="subtitle1" color="white" noWrap>
              &nbsp;&nbsp;{tokenData.temperaturaMax || 'N/A'}&nbsp;ºC {/* Acceso seguro */}
            </Typography>
          </div>
        </>
      ) : tokenData.operation === 5 ? (
        <div style={{ display: "flex" }}>
          <Typography variant="subtitle1" color="white" noWrap>
            <strong>Producto ofrecido al mercado</strong>
          </Typography>
          <Typography variant="subtitle1" color="white" noWrap>
            &nbsp;&nbsp;{tokenData.attrs?.lote || 'N/A'}
          </Typography>
        </div>
      ) : tokenData.operation === 6 ? (
        <div style={{ display: "flex" }}>
          <Typography variant="subtitle1" color="white" noWrap>
            <strong>Comprado por:</strong>
          </Typography>
          <Typography variant="subtitle1" color="white" noWrap>
            &nbsp;&nbsp;{tokenData.user?.nombre || 'N/A'}
          </Typography>
        </div>
      ) : (
        // Caso por defecto para otras operaciones (ej. "Entregado")
        <div style={{ display: "flex" }}>
          <Typography variant="subtitle1" color="white" noWrap>
            <strong>Entregado a:</strong>
          </Typography>
          <Typography variant="subtitle1" color="white" noWrap>
            &nbsp;&nbsp;{tokenData.user?.nombre || 'N/A'}
          </Typography>
        </div>
      )}

      <Grid>
        <Typography variant="h6" color="white" component="p">
          Información de la transacción
        </Typography>
        <Typography variant="body2" color="white" component="p">
          Número de bloque: {tokenData.blockNumber || 'N/A'} {/* Acceso seguro */}
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