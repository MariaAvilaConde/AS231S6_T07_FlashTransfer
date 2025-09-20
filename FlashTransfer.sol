// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FlashTrans - Transferencias simples de ETH sin intermediarios
/// @author ...
/// @notice Este contrato permite enviar ETH de un usuario a otro sin necesidad de bancos.
/// @dev Versión simple: sin roles, sin listas negras ni umbrales de riesgo.
contract FlashTransSimple {
    /// @notice Estructura que guarda información de cada transferencia
    struct Transfer {
        address sender;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        string memo;
    }

    /// @notice Lista de todas las transferencias realizadas
    Transfer[] public transfers;

    /// @notice Evento emitido cuando se realiza una transferencia
    /// @param sender Dirección del remitente
    /// @param recipient Dirección del destinatario
    /// @param amount Monto de ETH enviado (en wei)
    /// @param memo Mensaje opcional de la transferencia
    event TransferSent(address indexed sender, address indexed recipient, uint256 amount, string memo);

    /// @notice Permite enviar ETH a otra persona
    /// @dev Guarda un registro en la lista y transfiere ETH al destinatario
    /// @param recipient Dirección que recibirá el ETH
    /// @param memo Texto opcional que acompaña la transferencia
    function sendETH(address payable recipient, string calldata memo) external payable {
        require(msg.value > 0, "Debe enviar ETH mayor a 0");
        require(recipient != address(0), "Direccion invalida");

        // Enviar ETH
        (bool sent, ) = recipient.call{value: msg.value}("");
        require(sent, "Fallo en la transferencia");

        // Guardar en historial
        transfers.push(Transfer({
            sender: msg.sender,
            recipient: recipient,
            amount: msg.value,
            timestamp: block.timestamp,
            memo: memo
        }));

        emit TransferSent(msg.sender, recipient, msg.value, memo);
    }

    /// @notice Devuelve el número total de transferencias realizadas
    function getTotalTransfers() external view returns (uint256) {
        return transfers.length;
    }

    /// @notice Obtiene los detalles de una transferencia por índice
    /// @param index Índice en la lista de transferencias
    /// @return sender Dirección del remitente
    /// @return recipient Dirección del destinatario
    /// @return amount Monto enviado en wei
    /// @return timestamp Marca de tiempo del envío
    /// @return memo Mensaje opcional
    function getTransfer(uint256 index) external view returns (
        address sender,
        address recipient,
        uint256 amount,
        uint256 timestamp,
        string memory memo
    ) {
        require(index < transfers.length, "Indice fuera de rango");
        Transfer storage t = transfers[index];
        return (t.sender, t.recipient, t.amount, t.timestamp, t.memo);
    }
}
