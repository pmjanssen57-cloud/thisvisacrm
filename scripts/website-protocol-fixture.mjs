// Independent Node implementation of the pairing envelope for protocol tests.
import crypto from 'node:crypto';
export async function sealPairing(value,publicKey){
 const key=crypto.randomBytes(32),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
 const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final(),cipher.getAuthTag()]);
 const wrappedKey=crypto.publicEncrypt({key:crypto.createPublicKey({key:Buffer.from(publicKey,'base64'),type:'spki',format:'der'}),padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key);
 return {wrappedKey:wrappedKey.toString('base64'),iv:iv.toString('base64'),ciphertext:ciphertext.toString('base64')};
}
