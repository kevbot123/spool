import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import CryptoJS from 'crypto-js'
import { cn } from "@/lib/utils"

interface UserIdentification {
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface UserAvatarProps {
  userIdentification?: UserIdentification;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fallbackClassName?: string;
}

// Helper function to generate gravatar URL
const getGravatarUrl = (email: string, size: number = 32): string => {
  const hash = CryptoJS.MD5(email.toLowerCase().trim()).toString();
  return `https://www.gravatar.com/avatar/${hash}?d=404&s=${size}`; // d=404 returns 404 if no gravatar exists
};

// Helper function to get user avatar fallback text
const getUserAvatarFallback = (userIdentification?: UserIdentification): string => {
  if (userIdentification?.firstName) {
    return userIdentification.firstName.charAt(0).toUpperCase();
  }
  if (userIdentification?.email) {
    return userIdentification.email.charAt(0).toUpperCase();
  }
  return 'U';
};

const sizeMap = {
  sm: { avatar: 'h-6 w-6', text: 'text-xs', pixels: 24 },
  md: { avatar: 'h-8 w-8', text: 'text-xs', pixels: 32 },
  lg: { avatar: 'h-10 w-10', text: 'text-sm', pixels: 40 },
};

export function UserAvatar({ 
  userIdentification, 
  className, 
  size = 'md',
  fallbackClassName 
}: UserAvatarProps) {
  const sizeConfig = sizeMap[size];
  
  return (
    <Avatar className={cn(sizeConfig.avatar, className)}>
      <AvatarImage 
        src={userIdentification?.email ? getGravatarUrl(userIdentification.email, sizeConfig.pixels) : undefined} 
        onError={(e) => {
          // If gravatar fails to load, remove the src to show fallback
          e.currentTarget.removeAttribute('src');
        }}
      />
      <AvatarFallback className={cn(sizeConfig.text, fallbackClassName)}>
        {getUserAvatarFallback(userIdentification)}
      </AvatarFallback>
    </Avatar>
  );
} 