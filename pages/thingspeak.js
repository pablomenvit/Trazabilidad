import React, { useState, useRef } from 'react';
import { Contract} from "ethers";
import { NFT_CONTRACT_ADDRESS, ABI } from "../constants";
import Button from 'react-bootstrap/Button';

import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
// --- Importaciones de Material-UI ---
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

// Componente Alert personalizado para Snackbar (para usar el Alert de MUI)
const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});
export default function Thingspeak(props) {
  const {provider} = props;
  const {tokenId} = props;
 
  const [isCollecting, setIsCollecting] = useState(false);
  const [latestValue, setLatestValue] = useState(null); 
  const [dataPoints, setDataPoints] = useState([]);
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
 
  // --- Estado para la Snackbar/Alert de MUI ---
       const [snackbarOpen, setSnackbarOpen] = useState(false);
       const [snackbarMessage, setSnackbarMessage] = useState('');
       const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // 'success', 'info', 'warning', 'error' 
  
  
  const intervalId = useRef(null);

  const THINGSPEAK_API_KEY = 'H52OAH089BAPDLZC';
  const THINGSPEAK_CHANNEL_ID = '2866688';
  const THINGSPEAK_FIELD_NUMBER = '1';

  // --- Función para cerrar la Snackbar ---
    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };
    // --- Fin de Función para cerrar la Snackbar ---

  const fetchData = async () => {
    try {
      const response = await fetch(
        `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/fields/${THINGSPEAK_FIELD_NUMBER}.json?api_key=${THINGSPEAK_API_KEY}&results=1`
      );
      const data = await response.json();
      if (data.feeds && data.feeds.length > 0 && data.feeds[0].field1 !== null) {
        const newValue = parseFloat(data.feeds[0][`field${THINGSPEAK_FIELD_NUMBER}`]);
        setLatestValue(newValue); 
        setDataPoints((prevData) => [...prevData, newValue]);
      }
    } catch (error) {
      console.error('Error obteniendo datos de ThingSpeak:', error);
    }
  };

  const startCollection = () => {
    setIsCollecting(true);
    setDataPoints([]);
    setLatestValue(null); 
    setMinValue(null);
    setMaxValue(null);
    intervalId.current = setInterval(fetchData, 15000);
  };
    
   const temperaturasEnBlockchain = async (minTemp, maxTemp) => {
  try {
    const signer = provider.getSigner();
    
      const minValueBN = minTemp.toString(); 
      const maxValueBN = maxTemp.toString(); 

    
    setSnackbarMessage(`Guardando temperaturas en la blockchain...`);
      setSnackbarSeverity('info');
      setSnackbarOpen(true);

    
    const trazabilidad = new Contract(NFT_CONTRACT_ADDRESS, ABI, signer);
    const temperaturas = await trazabilidad.putTemperatura(tokenId, minValueBN, maxValueBN);

    await temperaturas.wait(); 
    
    setSnackbarMessage(`Temperaturas guardadas en la blockchain para el token ${tokenId}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
  } catch (error) {
    console.error("Error al guardar la temperatura en la blockchain:", error);
    window.alert("Error al guardar la temperatura en la blockchain");
    setSnackbarMessage("Error al guardar la temperatura en la blockchain");
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
  }
}
  
  const stopCollection = () => {
    setIsCollecting(false);
    clearInterval(intervalId.current);

  
    let calculatedMin = 0; 
    let calculatedMax = 0;

    if (dataPoints.length > 0) {
      calculatedMin = Math.min(...dataPoints);
      calculatedMax = Math.max(...dataPoints);

      
      setMinValue(calculatedMin);
      setMaxValue(calculatedMax);
    } else {
      console.warn("No se recolectaron datos de temperatura. Enviando 0 como min y max.");
    }

    
    temperaturasEnBlockchain(calculatedMin, calculatedMax);
  };

  return (
    <div>
      <Button variant="primary" onClick={startCollection} disabled={isCollecting || tokenId == ''}>
        Inicio
      </Button>
      <Button variant="primary" onClick={stopCollection} disabled={!isCollecting || tokenId == ''}>
        Fin
      </Button>

      {isCollecting && <p>Recolección en curso...</p>}

      {latestValue !== null && <p>Último valor: {latestValue}</p>}

      {dataPoints.length > 0 && (
        <div>
          <h3>Datos Recolectados:</h3>
          <ul>
            {dataPoints.map((value, index) => (
              <li key={index}>{value}</li>
            ))}
          </ul>
        </div>
      )}

      {minValue !== null && maxValue !== null && (
        <div>
          <p>Valor Mínimo: {minValue}</p>
          <p>Valor Máximo: {maxValue}</p>
        </div>
      )}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%', zIndex: 9999 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}