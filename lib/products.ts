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
  { id: "energéticos", name: "Energéticos" },
  { id: "vinhos", name: "Vinhos" },
  { id: "salgados", name: "Salgados" },
  { id: "doces", name: "Doces" },
  { id: "refrigerantes-350ml", name: "Refrigerantes 350ml" },
  { id: "sucos", name: "Sucos" }
]

export const products: Product[] = [
  {
    id: "1",
    name: "Coca-Cola 350ml",
    price: 1.5,
    category: "refrigerantes-350ml",
    image: "/refreshing-cola-can.png",
  },
  {
    id: "2",
    name: "Guaraná 350ml",
    price: 5.0,
    category: "refrigerantes-350ml",
    image: "/guarana-soda-can.jpg",
  },




  {
    id: "2",
    name: "Guaraná 350ml",
    price: 5.0,
    category: "refrigerantes-350ml",
    image: "/guarana-soda-can.jpg",
  },


  {
    id: "2",
    name: "Guaraná 350ml",
    price: 5.0,
    category: "refrigerantes-350ml",
    image: "/guarana-soda-can.jpg",
  },


  {
    id: "2",
    name: "Guaraná 350ml",
    price: 5.0,
    category: "refrigerantes-350ml",
    image: "/guarana-soda-can.jpg",
  },

  {
    id: "2",
    name: "Guaraná 350ml",
    price: 5.0,
    category: "refrigerantes-350ml",
    image: "/guarana-soda-can.jpg",
  },


  {
    id: "2",
    name: "Guaraná 350ml",
    price: 5.0,
    category: "refrigerantes-350ml",
    image: "/guarana-soda-can.jpg",
  },
]
