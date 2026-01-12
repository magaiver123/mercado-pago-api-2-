export interface Product {
  id: string
  name: string
  description?: string
  price: number
  category: string
  image: string
}

export interface Category {
  id: string
  name: string
}

export const categories: Category[] = [
  { id: "destaques", name: "Destaques" },
  { id: "sobremesas", name: "Sobremesas" },
  { id: "refrigerantes-350ml", name: "Refrigerantes 350ml" },
  { id: "sucos", name: "Sucos" },
]

export const products: Product[] = [
  {
    id: "9",
    name: "Coca-Cola 350ml",
    price: 1.5,
    category: "refrigerantes-350ml",
    image: "/refreshing-cola-can.png",
  },
  {
    id: "10",
    name: "Guaraná 350ml",
    price: 5.0,
    category: "refrigerantes-350ml",
    image: "/guarana-soda-can.jpg",
  },
]
