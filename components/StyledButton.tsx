import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface StyledButtonProps extends TouchableOpacityProps {
  title: string;
  className?: string;
}

export default function StyledButton({ title, className, ...props }: StyledButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      className={`bg-blue-600 px-6 py-3.5 rounded-full items-center justify-center shadow-md active:bg-blue-700 ${className || ''}`}
      {...props}
    >
      <Text className="text-white font-semibold text-base">{title}</Text>
    </TouchableOpacity>
  );
}
