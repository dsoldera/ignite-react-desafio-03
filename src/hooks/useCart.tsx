import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
       return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {

      if(!productId) {
        throw new Error('Erro na adição do produto');
      }
      const getProductById = await api.get<Product[]>('/products').then(response => {
         return response.data.find(product => product.id === productId)
      });
        
      if(!getProductById) {
        throw new Error('Erro na adição do produto');
      }
      const {data: productStock } = await api.get<Stock>(`/stock/${productId}`)

      if (productStock.amount <= 1) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      let existingProduct = cart.find(product => product.id === productId)
      let newCart: Product[] = [];

      if (!existingProduct) {
        const { data } = await api.get<Omit<Product, 'amount'>>(`/products/${productId}`)

        existingProduct = {
          ...data,
          amount: 1
        }

        newCart = [...cart, existingProduct];
        //console.log('newCart', newCart);
        setCart(newCart)


      } else {
        newCart = cart.map(product => product.id !== productId ? product : {
          ...product,
          amount: product.amount + 1
        })
  
        //console.log('newCart', newCart);
        setCart(newCart);
      }
      
      
      localStorage.setItem(`@RocketShoes:cart`, JSON.stringify(newCart))
    } catch(err:any) {
      toast.error(err.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);

      if (!product) {
        throw new Error('Erro na remoção do produto')
      }

      const newCart = cart.filter(product => product.id !== productId)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

      setCart(newCart)

    } catch(err:any) {
      toast.error(err.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const {data: productStock } = await api.get<Stock>(`/stock/${productId}`)
      //const getProductCartAmount = cart.filter(product => product.id === productId)[0].amount;
      // console.log('getProductCartAmount', getProductCartAmount);
      // console.log('amount', amount);
      // console.log('productStock amount', productStock.amount);

      if (amount <= 0) {
        throw new Error('Quantidade inválida')
      }

      const newCart = cart.map(product => product.id !== productId ? product : {
        ...product,
        amount,
      })
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      
      
      if (productStock.amount < amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      setCart(newCart)

    } catch(err: any) {
      toast.error(err.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
