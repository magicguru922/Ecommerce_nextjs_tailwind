import { useState, useEffect } from 'react'
import Link from 'next/link'

import Image from 'next/image'

import Meta from 'components/native/Meta'
import prisma from 'lib/prisma'
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    Cross2Icon,
    HomeIcon,
    MinusIcon,
    PlusIcon,
} from '@radix-ui/react-icons'
import { Button } from 'components/ui/button'
import { useValidAccessToken } from 'hooks/useAccessToken'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from 'components/ui/select'
import { isVariableValid } from 'lib/utils'
import { CloseIcon, Spinner } from 'components/native/icons'
import type {
    ProductWithAllVariants,
    CartItemWithVendorVariant,
} from 'types/prisma'
import { Badge } from 'components/ui/badge'
import { getCountInCart, getLocalCart, writeLocalCart } from 'lib/cart'

export default function Product({ unserialized }) {
    const [product, setProduct] = useState<ProductWithAllVariants | null>(null)

    useEffect(() => {
        if (unserialized) setProduct(JSON.parse(unserialized))
    }, [unserialized])

    if (isVariableValid(product)) {
        return (
            <>
                <Meta
                    title={product.title}
                    description={product.description}
                    image={product.images[0]}
                    canonical={process.env.NEXT_PUBLIC_URL}
                />
                <Breadcrumbs product={product} />
                <div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <ImageColumn product={product} />
                    <DataColumn product={product} />
                </div>
            </>
        )
    }
}

const DataColumn = ({ product }: { product: ProductWithAllVariants }) => {
    const { Authenticated, AccessToken } = useValidAccessToken()
    const [cartItems, setCartItems] = useState<
        CartItemWithVendorVariant[] | null
    >(null)
    const [wishlist, setWishlist] = useState(null)
    const [vendorVariantId, setVendorVariantId] = useState('')
    const [fetchingCart, setFetchingCart] = useState(true)
    const [fetchingWishlist, setFetchingWishlist] = useState(true)

    useEffect(() => {
        async function getCart() {
            try {
                if (Authenticated) {
                    const response = await fetch(`/api/cart`, {
                        headers: {
                            Authorization: `Bearer ${AccessToken}`,
                        },
                    })

                    const json = await response.json()
                    setCartItems(json?.cart?.items)
                    writeLocalCart(json?.cart?.items)
                    setFetchingCart(false)
                }

                if (!Authenticated) {
                    setCartItems(getLocalCart())
                    setFetchingCart(false)
                }
            } catch (error) {
                console.error({ error })
            }
        }

        async function getWishlist() {
            try {
                const answer = await fetch(`/api/wishlist`, {
                    headers: {
                        Authorization: `Bearer ${AccessToken}`,
                    },
                })

                const json = await answer.json()
                setWishlist(json?.wishlist?.items)
                setFetchingWishlist(false)
            } catch (error) {
                console.error({ error })
            }
        }

        getCart()
        if (Authenticated) getWishlist()
    }, [AccessToken, Authenticated])

    function isVariantInWishlist() {
        for (let i = 0; i < wishlist.length; i++) {
            if (wishlist[i]['id'] === product?.id) {
                return true
            }
        }
        return false
    }

    function findLocalCartIndexById(array, vendorVariantId) {
        for (let i = 0; i < array.length; i++) {
            if (array[i].vendorVariantId === vendorVariantId) {
                return i
            }
        }
        return -1
    }

    async function getVendorVariant() {
        try {
            const response = await fetch(`/api/vendor/variant`, {
                method: 'POST',
                body: JSON.stringify({ vendorVariantId }),
            })

            const json = await response.json()

            return json?.vendorVariant
        } catch (error) {
            console.error({ error })
        }
    }

    async function onAddToCart() {
        try {
            setFetchingCart(true)

            if (Authenticated) {
                const response = await fetch(`/api/cart/modify`, {
                    method:
                        getCountInCart({ cartItems, vendorVariantId }) > 0
                            ? 'PUT'
                            : 'POST',
                    body: JSON.stringify({ vendorVariantId }),
                    headers: {
                        Authorization: `Bearer ${AccessToken}`,
                    },
                })

                const json = await response.json()

                setCartItems(json?.cart?.items)
                writeLocalCart(json?.cart?.items)
            }

            const localCart = getLocalCart() as any[]
            if (
                !Authenticated &&
                getCountInCart({ cartItems, vendorVariantId }) > 0
            ) {
                for (let i = 0; i < localCart.length; i++) {
                    if (localCart[i].vendorVariantId === vendorVariantId) {
                        localCart[i].count = localCart[i].count + 1
                    }
                }

                setCartItems(localCart)
                writeLocalCart(localCart)
            }

            if (
                !Authenticated &&
                getCountInCart({ cartItems, vendorVariantId }) < 1
            ) {
                localCart.push({
                    vendorVariantId,
                    vendorVariant: await getVendorVariant(),
                    count: 1,
                })

                writeLocalCart(localCart)
                setCartItems(localCart)
            }

            setFetchingCart(false)
        } catch (error) {
            console.error({ error })
        }
    }

    async function onRemoveFromCart() {
        try {
            setFetchingCart(true)

            if (Authenticated) {
                const response = await fetch(`/api/cart/modify`, {
                    method:
                        getCountInCart({ cartItems, vendorVariantId }) > 1
                            ? 'PATCH'
                            : 'DELETE',
                    body: JSON.stringify({ vendorVariantId }),
                    headers: {
                        Authorization: `Bearer ${AccessToken}`,
                    },
                })

                const json = await response.json()

                setCartItems(json?.cart?.items)
                writeLocalCart(json?.cart?.items)
                setFetchingCart(false)
            }

            const localCart = getLocalCart() as any[]
            const index = findLocalCartIndexById(localCart, vendorVariantId)
            const count = localCart[index].count

            if (
                !Authenticated &&
                getCountInCart({ cartItems, vendorVariantId }) > 1
            ) {
                localCart[index].count = count - 1

                setCartItems(localCart)
                writeLocalCart(localCart)
            }

            if (
                !Authenticated &&
                getCountInCart({ cartItems, vendorVariantId }) === 1
            ) {
                localCart.splice(index, 1)

                writeLocalCart(localCart)
                setCartItems(localCart)
            }

            setFetchingCart(false)
        } catch (error) {
            console.error({ error })
        }
    }

    async function onAddToWishlist() {
        try {
            setFetchingWishlist(true)

            const response = await fetch(`/api/wishlist/modify`, {
                method: 'POST',
                body: JSON.stringify({ productId: product?.id }),
                headers: {
                    Authorization: `Bearer ${AccessToken}`,
                },
            })

            const json = await response.json()

            const items = json?.wishlist?.items

            setWishlist(items)
            setFetchingWishlist(false)
        } catch (error) {
            console.error({ error })
        }
    }

    async function onRemoveFromWishlist() {
        try {
            setFetchingWishlist(true)

            const response = await fetch(`/api/wishlist/modify`, {
                method: 'DELETE',
                body: JSON.stringify({ productId: product.id }),
                headers: {
                    Authorization: `Bearer ${AccessToken}`,
                },
            })

            const json = await response.json()

            const items = json?.wishlist?.items

            setWishlist(items)
            setFetchingWishlist(false)
        } catch (error) {
            console.error({ error })
        }
    }

    function CartButton() {
        if (fetchingCart)
            return (
                <Button disabled>
                    <Spinner />
                </Button>
            )

        if (getCountInCart({ cartItems, vendorVariantId }) === 0) {
            return (
                <Button disabled={vendorVariantId == ''} onClick={onAddToCart}>
                    🛒 Add to Cart
                </Button>
            )
        }

        if (getCountInCart({ cartItems, vendorVariantId }) > 0) {
            return (
                <>
                    <Button
                        disabled={vendorVariantId == ''}
                        variant="outline"
                        size="icon"
                        onClick={onRemoveFromCart}
                    >
                        {getCountInCart({ cartItems, vendorVariantId }) == 1 ? (
                            <Cross2Icon className="h-4 w-4" />
                        ) : (
                            <MinusIcon className="h-4 w-4" />
                        )}
                    </Button>

                    <Button disabled variant="outline" size="icon">
                        {getCountInCart({ cartItems, vendorVariantId })}
                    </Button>
                    <Button
                        disabled={vendorVariantId == ''}
                        variant="outline"
                        size="icon"
                        onClick={onAddToCart}
                    >
                        <PlusIcon className="h-4 w-4" />
                    </Button>
                </>
            )
        }
    }

    function WishlistButton() {
        if (!Authenticated) return null
        if (fetchingWishlist)
            return (
                <Button disabled>
                    <Spinner />
                </Button>
            )

        if (!isVariantInWishlist()) {
            return (
                <Button
                    disabled={vendorVariantId == ''}
                    onClick={onAddToWishlist}
                >
                    🛒 Add to Wishlist
                </Button>
            )
        }

        if (isVariantInWishlist()) {
            return (
                <Button
                    disabled={vendorVariantId == ''}
                    onClick={onRemoveFromWishlist}
                >
                    🛒 Remove from Wishlist
                </Button>
            )
        }
    }

    return (
        <div className="col-span-2 w-full rounded-lg bg-neutral-100 p-6 dark:bg-neutral-900">
            <h3 className="mb-4 text-xl font-medium text-black dark:text-white">
                {product.title}
            </h3>
            <hr className="my-4 w-full border-neutral-200 dark:border-neutral-800 sm:mx-auto" />
            <div className="flex gap-2 mb-2">
                <p className="text-sm">Brand:</p>
                <Badge variant="outline">{product.brand.title}</Badge>
            </div>
            <div className="flex gap-2">
                <p className="text-sm">Categories:</p>
                {product.categories.map(({ title }, index) => (
                    <Badge variant="outline" key={index}>
                        {title}
                    </Badge>
                ))}
            </div>
            <hr className="my-4 w-full border-neutral-200 dark:border-neutral-800 sm:mx-auto" />
            <small className="text-black dark:text-white">
                {product.description}
            </small>
            <hr className="my-4 w-full border-neutral-200 dark:border-neutral-800 sm:mx-auto" />
            <label className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
                Select an option
            </label>
            <Select onValueChange={(e) => setVendorVariantId(e)}>
                <SelectTrigger className="w-full md:w-[50%] my-3">
                    <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                    {product.variants.map(
                        ({ title, vendorVariants }, index) => (
                            <div key={index}>
                                {vendorVariants.map((item, innerIndex) => (
                                    <SelectItem
                                        key={innerIndex}
                                        value={item.id}
                                    >
                                        {title} - ${item.price}
                                    </SelectItem>
                                ))}
                            </div>
                        )
                    )}
                </SelectContent>
            </Select>

            <div className="flex gap-2">
                <CartButton />
                <WishlistButton />
            </div>
        </div>
    )
}

const ImageColumn = ({ product }) => {
    return (
        <div className="relative min-h-[50vh] w-full col-span-1">
            <Image
                src={product['variants'][0]['images'][0]}
                alt="Product Image"
                fill
                className="rounded-lg"
                style={{ objectFit: 'cover' }}
            />
        </div>
    )
}

const Breadcrumbs = ({ product }) => {
    return (
        <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    >
                        Home
                    </Link>
                </li>
                <li>
                    <div className="flex items-center">
                        <ChevronRightIcon />
                        <Link
                            className="ml-1 text-sm font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white md:ml-2"
                            href="/products"
                        >
                            Products
                        </Link>
                    </div>
                </li>
                <li aria-current="page">
                    <div className="flex items-center">
                        <ChevronRightIcon />
                        <span className="ml-1 text-sm font-medium text-neutral-500 dark:text-neutral-400 md:ml-2">
                            {product.title || '---'}
                        </span>
                    </div>
                </li>
            </ol>
        </nav>
    )
}

export async function getServerSideProps(context) {
    const { id } = context.query

    try {
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                brand: true,
                variants: {
                    include: {
                        vendorVariants: true,
                    },
                },
                categories: true,
            },
        })
        return {
            props: { unserialized: JSON.stringify(product) },
        }
    } catch (error) {
        console.error({ error })
        return { props: {} }
    }
}
