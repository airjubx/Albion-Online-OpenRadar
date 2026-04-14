package photon

import "encoding/binary"

// newSingleCommandPhotonPacket wraps a single command payload in a minimal
// Photon packet (12-byte photon header + 12-byte command header + payload).
// The photon header sets commandCount=1; all other fields are zero.
func newSingleCommandPhotonPacket(cmdType byte, cmdPayload []byte) []byte {
	cmdLen := commandHeaderLength + len(cmdPayload)

	cmdHeader := make([]byte, commandHeaderLength)
	cmdHeader[0] = cmdType
	binary.BigEndian.PutUint32(cmdHeader[4:], uint32(cmdLen))

	pktHeader := make([]byte, photonHeaderLength)
	pktHeader[3] = 1

	pkt := append(pktHeader, cmdHeader...)
	return append(pkt, cmdPayload...)
}

// newReliableMessagePacket builds a single-command Photon packet carrying one
// reliable message (request/response/event) with the given msgType + payload.
func newReliableMessagePacket(msgType byte, innerPayload []byte) []byte {
	reliable := append([]byte{0x00, msgType}, innerPayload...)
	return newSingleCommandPhotonPacket(cmdSendReliable, reliable)
}
