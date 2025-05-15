import styles from '../styles/Home.module.css'
import { Contract } from 'ethers'
import React, { useState } from 'react'
import { ABI, NFT_CONTRACT_ADDRESS } from '../constants'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import '../node_modules/bootstrap/dist/css/bootstrap.min.css'

export default function Owner (props) {

  const [address, setAddress] = useState('');
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');

  const getContract = async (needSigner = false) => {
    if (needSigner) {
      const signer = props.provider.getSigner();
      return new Contract(NFT_CONTRACT_ADDRESS, ABI, signer);
    }
    return new Contract(NFT_CONTRACT_ADDRESS, ABI, props.provider);
  }

  const translateRole = (role) => {
    switch (role) {
      case "Farmer":
        return 0;
      case "Baker":
        return 1;
      case "Customer":
        return 2;
    }
  }

  const registerUser = async () => {
    try {
      const transparency = await getContract(true);

      await transparency.registerUser(
        address,
        userName,
        location,
        Date.now(),
        translateRole(role)
      );
    } catch (error) {
      console.log(error);
      window.alert("Ha habido un error al registrar el usuario");
    }
  }

  const handleRegister = event => {

    event.preventDefault();

    registerUser();

    setAddress('');
    setUserName('');
    setRole('');
    setLocation('');
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
            <Form.Group className="mb-3" controlId="userName">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                placeholder="Enter user Introduce el nombre"
                value={userName}
                onChange={event => setUserName(event.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="role">
              <Form.Label>Rol</Form.Label>
              <Form.Control
                placeholder="Selecciona el Rol"
                value={role}
                onChange={event => setRole(event.target.value)}
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
    </div>
  )
}
