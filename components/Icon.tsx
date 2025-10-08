
import React from 'react';
import { SvgProps } from 'react-native-svg';
import HouseIcon from '../assets/icons/house.fill.svg';
import PaperplaneIcon from '../assets/icons/paperplane.fill.svg';

const icons = {
  'house.fill': HouseIcon,
  'paperplane.fill': PaperplaneIcon,
};

export type IconName = keyof typeof icons;

interface IconProps extends SvgProps {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size = 28, ...props }: IconProps) {
  const IconComponent = icons[name];
  return <IconComponent width={size} height={size} {...props} />;
}
