import React from 'react';
import gifImage from '../assets/images/gifImage.gif'

const GifLoder = () => {
    return (
        <>
            <img src={gifImage} alt="gif" className="loderDivimg" />
        </>
        );
    };
export default GifLoder;