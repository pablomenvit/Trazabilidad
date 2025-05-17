import { useState, useEffect } from 'react';

export default function Thingspeak() {
  const [thingSpeakValue, setThingSpeakValue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('https://api.thingspeak.com/channels/2866688/fields/1.json?api_key=H52OAH089BAPDLZC');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error al obtener datos: ${response.statusText}`);
        }
        const data = await response.json();
        // Accede al valor dentro del array 'feeds' y formatea a un decimal
        if (data.feeds && data.feeds.length > 0 && data.feeds[0].field1 !== null) {
          const rawValue = parseFloat(data.feeds[0].field1);
          setThingSpeakValue(rawValue.toFixed(1));
          console.log("El valor del campo 1 es : ", rawValue.toFixed(1));
        } else {
          setThingSpeakValue(null);
          console.log("No se encontraron feeds o el valor es nulo.");
        }
        setError(null);
      } catch (err) {
        setError(err.message);
        setThingSpeakValue(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Opcional: Actualizar cada cierto tiempo
    const intervalId = setInterval(fetchData, 15000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <p>Cargando datos de ThingSpeak...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Valor de ThingSpeak</h1>
      {thingSpeakValue !== null ? (
        <p>Último valor: {thingSpeakValue} ºC</p>
      ) : (
        <p>No se pudo obtener el valor.</p>
      )}
    </div>
  );
}