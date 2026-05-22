import { Box } from '@chakra-ui/react';
import type { HttpMethod } from '../../types';
import { getHttpMethodBadgeStyle } from '../../utils/httpMethodStyle';

interface Props {
  method: HttpMethod;
}

export default function HttpMethodTabBadge({ method }: Props) {
  const style = getHttpMethodBadgeStyle(method);

  return (
    <Box
      as="span"
      flexShrink={0}
      px="1.5"
      py="0.5"
      rounded="sm"
      fontSize="2xs"
      fontFamily="mono"
      fontWeight="semibold"
      lineHeight="1"
      letterSpacing="label"
      bg={style.bg}
      color={style.color}
    >
      {method}
    </Box>
  );
}
