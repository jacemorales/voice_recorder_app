
import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface StyledButtonProps extends TouchableOpacityProps {
  title: string;
  className?: string;
}

export default function StyledButton({ title, className, ...props }: StyledButtonProps) {
  return (
    <TouchableOpacity className={`bg-blue-500 p-4 rounded-lg items-center ${className}`} {...props}>
      <Text className="text-white font-bold">{title}</Text>
    </TouchableOpacity>
  );
}
