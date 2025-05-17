import { Contract, utils } from "ethers";
import React, { useEffect, useState } from "react";
import { NFT_CONTRACT_ADDRESS, ABI } from "../constants";
import Thinkspeak from "./thingspeak";
// styles and html components
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Image from 'next/image';
import styles from "../styles/Home.module.css";
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';


export default function Transporte(props) {

  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [prevIndex, setPrevIndex] = useState(null);
  const [selectedTokenId, setSelectedTokenId] = useState('');
  const [mostrarThingspeak, setMostrarThingspeak] = useState(false);
  // variables related to mint of token
  const [producto, setProducto] = useState('');
  const [lote, setLote] = useState('');
  const [fertilizante, setFertilizante] = useState('');

  const comercioAddress = "0x71AF60DfAf489E86Ff9dfEEC167D839d0aa0FAe0";


  const getContract = async (needSigner = false) => {
    if (needSigner) {
      const signer = props.provider.getSigner();
      return new Contract(NFT_CONTRACT_ADDRESS, ABI, signer);
    }
    return new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);
  }

  const getTokens = async () => {
    const trazabilidad = await getContract(true);
    const tokens = await trazabilidad.getTokenIds();
    var res = [];

    for (var i = 0; i < tokens.length; i++) {
      var id = tokens[i].toNumber();
      if (id != 0) {
        const attrs = await trazabilidad.obtenerAtributosToken(tokens[i]);
        res.push({
          tokenId: id,
          producto: attrs[2],
          lote: attrs[1],
          fertilizante: attrs[3], 
          estado: attrs[4],
        });
      }
    }

    setTokens(res);
    setLoading(false);
  }

  

  const handleClick = event => {

    event.preventDefault();

    setMostrarThingspeak(true);
  };

  const transferComercio = async () => {
    try {
      const trazabilidad = await getContract(true);
      const tx = await trazabilidad.transferirAComercio(utils.getAddress(comercioAddress), selectedTokenId);

      setLoading(true);
      await tx.wait();

    } catch (error) {
      console.log(error);
      window.alert("Error al transferir el token");
    }
  }

  const onClickTokenSelect = (tokenId, index) => {
    if (prevIndex == index) {
      setPrevIndex(null);
      setSelectedTokenId('');
    } else {
      setPrevIndex(index);
      setSelectedTokenId(tokenId);
    }
  }

  const translateState = (state) => {
    switch (state) {
      case 0:
        return "Nuevo";
      case 1:
        return "Entregado";
      case 2:
        return "Aceptado";
      case 3:
        return "Rechazado";
    }
  }
/*
  useEffect(() => {

    const transparency = new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);

    var currentAccount;
    props.provider.send("eth_requestAccounts", []).then(function (result) {
      currentAccount = utils.getAddress(result[0]);
    });

    async function fetchTokens() {
      setLoading(true);
      await getTokens();
    }
    fetchTokens();

    transparency.on(transparency.filters.Transaccion(currentAccount, null, 0), async (_from, _tokenId, _state) => {
      setLoading(true);
      await getTokens();
    });

    transparency.on(transparency.filters.Transaccion(comercioAddress, null, [1, 3]), async (_from, _tokenId, _state) => {
      setLoading(true);
      await getTokens();
    });

    return () => {
      props.provider.removeAllListeners();
    }

  }, [props])

*/
  return (
    <div>
      <div className={styles.main}>
        <div className={styles.title}>
          <Image width={100} height={100} src="/transporte.png" alt="icono transporte" />
          <h2>Transporte</h2>
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
                  <td>{item.fertilizante}</td>
                  <td>{item.lote}</td>
                  <td>{translateState(item.estado)}</td>
                </tr>
              ))
            }

          </tbody>
        </Table>

        
        <div className={styles.flexContainer}>
            {mostrarThingspeak && (
            <div className={styles.form}>               
                <Thinkspeak />
            </div>
            )}
        </div>
        

        <div className={styles.flexContainer}>
            <div className={styles.form}>
                <h4>Minado de token</h4>
                <Form>   
    
                    <Button onClick={handleClick} style={{ marginRight: '10px' }} variant="primary" type="submit">
                        Inicio Transporte
                    </Button>
                    <Button variant="primary" type="submit">
                        Fin Transporte
                    </Button>
                </Form>
            </div>
          <div className={styles.form}>
            <h4>Transferencias</h4>
              {
                <div>
                  <p>Selecciona el token a transferir</p>
                  <Button variant="primary" onClick={transferComercio} disabled={selectedTokenId == ''}>
                    Transfiere al mercado
                  </Button>
                </div>
            }   
          </div>
        </div>

      </div>
    </div>
  )
}