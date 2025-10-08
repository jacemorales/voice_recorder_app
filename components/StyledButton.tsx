
import { styled } from 'nativewind';
import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface StyledButtonProps extends TouchableOpacityProps {
  title: string;
  className?: string;
}

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

export default function StyledButton({ title, className, ...props }: StyledButtonProps) {
  return (
    <StyledTouchableOpacity className={`bg-blue-500 p-4 rounded-lg items-center ${className}`} {...props}>
      <StyledText className="text-white font-bold">{title}</StyledText>
    </StyledTouchableOpacity>
  );
}
