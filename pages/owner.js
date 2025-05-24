import styles from '../styles/Home.module.css'
import { Contract } from 'ethers'
import React, { useState } from 'react'
import { ABI, NFT_CONTRACT_ADDRESS } from '../constants'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import '../node_modules/bootstrap/dist/css/bootstrap.min.css'

import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
// Componente Alert personalizado para Snackbar 
const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Owner (props) {

  const [address, setAddress] = useState('');
  const [nombre, setNombre] = useState('');
  const [role, setRole] = useState('');
  // --- Estado para la Snackbar/Alert de MUI ---
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // 'success', 'info', 'warning', 'error' 

  // --- Función para cerrar la Snackbar ---
    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };
    // --- Fin de Función para cerrar la Snackbar ---

  const getContract = async (needSigner = false) => {
    if (needSigner) {
      const signer = props.provider.getSigner();
      return new Contract(NFT_CONTRACT_ADDRESS, ABI, signer);
    }
    return new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);
  }

  const translateRole = (role) => {
    switch (role) {
      case "Agricultor":
        return 0;
      case "Comercio":
        return 1;
      case "Transporte":
        return 2;
      case "Consumidor":
        return 3;
    }
  }

  const registrarUsuario = async () => {
    try {
      const trazabilidad = await getContract(true);
      setSnackbarMessage(`Registrando al usuario ${nombre}`);
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      await trazabilidad.registrarUsuario(
        address,
        nombre,
        role
      );
      await trazabilidad.waitForTransaction();
      setSnackbarMessage(`Usuario ${nombre} registrado correctamente`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.log(error);
      setSnackbarMessage(`Ha habido un error al registrar el usuario`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }

  const handleRegister = event => {

    event.preventDefault();

    registrarUsuario();

    setAddress('');
    setNombre('');
    setRole('');
  }

  return (
    <div>
      <div className={styles.main}>
        <h2>Panel de administración de usuarios</h2>
        <div className={styles.form}>
          <Form onSubmit={handleRegister}>
            <h4>Usuario</h4>
            <Form.Group className="mb-3" controlId="adress">
              <Form.Label>Address del usuario</Form.Label>
              <Form.Control
                placeholder="Introduce la address"
                value={address}
                onChange={event => setAddress(event.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="nombre">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                placeholder="Introduce el nombre"
                value={nombre}
                onChange={event => setNombre(event.target.value)}
              />
            </Form.Group>
            

            <Form.Group className="mb-3" controlId="rol">
              <Form.Label>Rol</Form.Label>
                <Form.Select
                  value={role}
                  onChange={event => setRole(event.target.value)}>
                  <option>Selecciona rol</option>
                  <option value="0">Agricultor</option>
                  <option value="1">Comercio</option>
                  <option value="2">Transporte</option>
                  <option value="3">Consumidor</option>
                </Form.Select>
            </Form.Group>
            <Button variant="primary" type="submit">
              Registrar usuario
            </Button>
          </Form>
        </div>
      </div>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%', zIndex: 9999 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  )
}
