import { Contract, utils } from "ethers";
import React, { useEffect, useState } from "react";
import { NFT_CONTRACT_ADDRESS, ABI } from "../constants";
// styles and html components
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import styles from "../styles/Home.module.css";
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';


export default function Agicultor(props) {

  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [prevIndex, setPrevIndex] = useState(null);
  const [selectedTokenId, setSelectedTokenId] = useState('');
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
    const transparency = await getContract(true);
    const tokens = await transparency.getTokenIds();
    var res = [];

    for (var i = 0; i < tokens.length; i++) {
      var id = tokens[i].toNumber();
      if (id != 0) {
        const attrs = await trazabilidad.getTokenAttrs(tokens[i]);
        res.push({
          tokenId: id,
          producto: attrs[1],
          lote: attrs[2],
          precio: attrs[4],
          fertilizante: attrs[3], 
          estado: attrs[8],
        });
      }
    }

    setTokens(res);
    setLoading(false);
  }

  const minadoAgricultor = async () => {
    try {
      let tokenId = Date.now();
      const trazabilidad = await getContract(true);
      const tx = await trazabilidad.mint(0, tokenId, producto, lote, fertilizante);

      setLoading(true);
      await tx.wait();

    } catch (error) {
      console.log(error);
      window.alert("Ha habido un error al minar el token!");
    }
  }

  const handleMint = event => {

    event.preventDefault();

    minadoAgricultor();

    setPrevIndex(null);
    setSelectedTokenId('');
    setLote('');
    setProducto('');
    setFertiizante('');
  }

  const transferComercio = async () => {
    try {
      const trazabilidad = await getContract(true);
      const tx = await trazabilidad.transferirAlsiguiente(utils.getAddress(comercioAddress), selectedTokenId);

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
        return "New";
      case 1:
        return "Delivered";
      case 2:
        return "Accepted";
      case 3:
        return "Rejected";
    }
  }

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


  return (
    <div>
      <div className={styles.main}>
        <div className={styles.title}>
          <img width={100} height={100} src="./agricultor.png" alt="icono agricultor" />
          <h2>Agricultor</h2>
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
                  <td>{item.fertilizante}</td>
                  <td>{item.lote}</td>
                  <td>{translateState(item.state)}</td>
                </tr>
              ))
            }

          </tbody>
        </Table>


        <div className={styles.flexContainer}>
          <div className={styles.form}>
            <Form onSubmit={handleMint}>
              <h4>Mint</h4>
              <Form.Group className="mb-3" controlId="productName">
                <Form.Label>Producto</Form.Label>
                <Form.Control
                  placeholder="Introduce el producto"
                  value={producto}
                  onChange={event => setProducto(event.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="quantity">
                <Form.Label>Lote</Form.Label>
                <Form.Control
                  placeholder="Número de lote"
                  value={lote}
                  onChange={event => setLote(event.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="quantity">
                <Form.Label>Fertilizante</Form.Label>
                <Form.Control
                  placeholder="Fertilizante usado"
                  value={fertilizante}
                  onChange={event => setFertilizante(event.target.value)}
                />
              </Form.Group>
              {
                <Button variant="primary" type="submit" disabled={producto == '' || lote == '' || fertilizante == ''}>
                  Mint
                </Button>
              }

            </Form>
          </div>

          <div className={styles.form}>
            <h4>Transfers</h4>
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