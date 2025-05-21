import { useState, useRef } from 'react';
import { Contract, utils } from "ethers";
import { NFT_CONTRACT_ADDRESS, ABI } from "../constants";
import Button from 'react-bootstrap/Button';

import '../node_modules/bootstrap/dist/css/bootstrap.min.css';

export default function Thingspeak(props) {
  const {provider} = props;
  const {tokenId} = props;
 
  const [isCollecting, setIsCollecting] = useState(false);
  const [latestValue, setLatestValue] = useState(null); // Nuevo estado para el último valor
  const [dataPoints, setDataPoints] = useState([]);
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  
  
  const intervalId = useRef(null);

  const THINGSPEAK_API_KEY = 'H52OAH089BAPDLZC';
  const THINGSPEAK_CHANNEL_ID = '2866688';
  const THINGSPEAK_FIELD_NUMBER = '1';

  const fetchData = async () => {
    try {
      const response = await fetch(
        `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/fields/${THINGSPEAK_FIELD_NUMBER}.json?api_key=${THINGSPEAK_API_KEY}&results=1`
      );
      const data = await response.json();
      if (data.feeds && data.feeds.length > 0 && data.feeds[0].field1 !== null) {
        const newValue = parseFloat(data.feeds[0][`field${THINGSPEAK_FIELD_NUMBER}`]);
        setLatestValue(newValue); // Actualiza el último valor
        setDataPoints((prevData) => [...prevData, newValue]);
      }
    } catch (error) {
      console.error('Error obteniendo datos de ThingSpeak:', error);
    }
  };

  const startCollection = () => {
    setIsCollecting(true);
    setDataPoints([]);
    setLatestValue(null); // Reinicia el último valor
    setMinValue(null);
    setMaxValue(null);
    intervalId.current = setInterval(fetchData, 15000);
  };
    
   const temperaturasEnBlockchain = async (minTemp, maxTemp) => {
  try {
    const signer = provider.getSigner();
    //const minValueBN = utils.parseUnits(minTemp !== null && minTemp !== undefined ? minTemp.toString() : '0', 1);
    //const maxValueBN = utils.parseUnits(maxTemp !== null && maxTemp !== undefined ? maxTemp.toString() : '0', 1);
      const minValueBN = minTemp.toString(); // Convierte el número a string
      const maxValueBN = maxTemp.toString(); // Convierte el número a string

    window.alert(`Temperatura mínima: ${minValueBN}, Temperatura máxima: ${maxValueBN}`);

    // ¡DESCOMENTA ESTA LÍNEA!
    const trazabilidad = new Contract(NFT_CONTRACT_ADDRESS, ABI, signer);
    const temperaturas = await trazabilidad.putTemperatura(tokenId, minValueBN, maxValueBN);

    await temperaturas.wait(); // Ahora 'temperaturas' estará definida

    window.alert(`Temperaturas guardadas correctamente.`); // Puedes añadir esto para confirmar

  } catch (error) {
    console.error("Error al guardar la temperatura en la blockchain:", error); // Usar console.error para visibilidad
    window.alert("Error al guardar la temperatura en la blockchain");
  }
}
  
  const stopCollection = () => {
    setIsCollecting(false);
    clearInterval(intervalId.current);

    // Calcula los valores MIN y MAX AQUI
    let calculatedMin = 0; // Valores por defecto en caso de no haber datos
    let calculatedMax = 0;

    if (dataPoints.length > 0) {
      calculatedMin = Math.min(...dataPoints);
      calculatedMax = Math.max(...dataPoints);

      // Opcional: Actualiza el estado para que se refleje en la UI, pero no se usan para la llamada a blockchain
      setMinValue(calculatedMin);
      setMaxValue(calculatedMax);
    } else {
      console.warn("No se recolectaron datos de temperatura. Enviando 0 como min y max.");
    }

    // Llama a la función con los valores CALCULADOS DIRECTAMENTE, NO con el estado que aún es null
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

      {latestValue !== null && <p>Último valor: {latestValue}</p>} {/* Muestra el último valor */}

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
    </div>
  );
}