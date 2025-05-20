import { useState, useRef } from 'react';
import { Contract, utils } from "ethers";
import { NFT_CONTRACT_ADDRESS, ABI } from "../constants";
import Button from 'react-bootstrap/Button';

import '../node_modules/bootstrap/dist/css/bootstrap.min.css';

export default function Thingspeak(props) {
  const {provider} = props;
  const {tokenId} = props;
 // const [temperaturaGLocal, setTemperaturaGLocal] = useState(props));
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
      console.error('Error fetching data from ThingSpeak:', error);
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
    
   const temperaturasEnBlockchain = async () => {  
    try {
      const signer = provider.getSigner();
      const minValueBN = utils.parseUnits(minValue !== null ? minValue.toString() : '0', 0);
      const maxValueBN = utils.parseUnits(minValue !== null ? maxValue.toString() : '0', 0);
      const trazabilidad = new Contract(NFT_CONTRACT_ADDRESS, ABI, signer);
      const temperaturas = await trazabilidad.putTemperatura(tokenId, minValueBN, maxValueBN);      

     
      await temperaturas.wait();
   //   setTemperaturaGLocal(true);
      window.alert("Temperatura guardada en la blockchain");

    } catch (error) {
      console.log(error);
      window.alert("Error al aguradar la temperatura en la blockchain");
    }
  }
  
  const stopCollection = () => {
    setIsCollecting(false);
    clearInterval(intervalId.current);
    if (dataPoints.length > 0) {
      setMinValue(Math.min(...dataPoints));
      setMaxValue(Math.max(...dataPoints));
    }

    temperaturasEnBlockchain(minValue, maxValue);
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