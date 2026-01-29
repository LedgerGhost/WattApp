import acType2Img from '../assets/images/actyp2.jpg'
import ccsImg from '../assets/images/ccs2.jpg'
import chademoImg from '../assets/images/chademo.jpg'
import gbtAcImg from '../assets/images/gb-t_ac.jpg'
import gbtDcImg from '../assets/images/gb-t_dc.jpg'

export const chargerImages = [
    acType2Img,
    ccsImg,
    chademoImg,
    gbtAcImg,
    gbtDcImg
];

export const getChargerImage = (type?: string) => {
    if (!type) return acType2Img
    const t = type.toLowerCase()
    if (t.includes('ccs')) return ccsImg
    if (t.includes('chademo')) return chademoImg
    if (t.includes('gb') && t.includes('dc')) return gbtDcImg
    if (t.includes('gb')) return gbtAcImg
    if (t.includes('type2') || t.includes('type 2')) return acType2Img
    return acType2Img
}
