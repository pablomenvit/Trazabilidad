import { Contract, utils } from "ethers";
import React, { useEffect, useState } from "react";
import { NFT_CONTRACT_ADDRESS, ABI } from "../constants";
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
  // variables related to mint of token
 
  const [precioProducto, setPrecioProducto] = useState('');
  // helpers variables for forms
  const [isNew, setIsNew] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  const transporteAddress = '0xDfe91ee7f72e6820D2F4e9f1C5A801A85dD4f2ca';
  

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
          fertilizante: attrs[1],
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

      setLoading(true);
      await tx.wait();

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

  // al pulsar el boton se asigna el precio al token pero no se envia la propiedad al conrtato, 
  // se envia al transporte y cuando este termine se pasa al contrato.
/*  const putOnSale = async () => {
    try {
      const trazabilidad = await getContract(true);
      const tx = await trazabilidad.putOnSale(selectedTokenId, precioProducto);

      setLoading(true);
      await tx.wait();

    } catch (error) {
      console.log(error);
      window.alert("Ha habido un error al poner el token en venta");
    }
  }
  */
  const asignarPrecio = async () => {
    try {
      const trazabilidad = await getContract(true);
      const tx = await trazabilidad.putPrecio(selectedTokenId, precioProducto);     
      await tx.wait();
      const transport = await trazabilidad.transferirAtransporte(transporteAddress, selectedTokenId);
      setLoading(true);
      
    } catch (error) {
      console.log(error);
      window.alert("Ha habido un error al asignar el precio");
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
                    <img src="./loading.gif" alt="loading..." />
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
            <h4>Precio de venta</h4>
            {
              selectedTokenId != '' && isNew ?
                <p>Token seleccionado para la venta</p>
                :
                <p>Selecciona un token nuevo</p>
            }
            <Form onSubmit={handlePutOnSale}>
              <Form.Group className="mb-3" controlId="precio">
                <Form.Label>Precio</Form.Label>
                <Form.Control
                  placeholder="Introduce el precio de venta para el producto"
                  value={precioProducto}
                  onChange={event => {setPrecioProducto(event.target.value)}}
                />
              </Form.Group>
              {
                <Button variant="primary" type="submit" disabled={selectedTokenId == '' || precioProducto == ''}>
                  Poner en venta
                </Button>
              }
            </Form>
          </div>
        </div>

      </div>
    </div>
  )
}