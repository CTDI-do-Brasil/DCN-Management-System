import React from 'react';
import ctdiLogoImg from '../assets/ctdi-logo.png';

interface CTDILogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  alt?: string;
}

export const CTDILogo: React.FC<CTDILogoProps> = ({
  className = '',
  width,
  height,
  alt = 'CTDI Logo'
}) => {
  return (
    <img
      src={ctdiLogoImg}
      alt={alt}
      width={width}
      height={height}
      className={`select-none object-contain ${className}`}
      draggable={false}
    />
  );
};

