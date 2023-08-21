import { useEffect, useState } from 'react'

import Meta from 'components/native/Meta'
import Config from 'config/site'
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'
import { useValidAccessToken } from 'hooks/useAccessToken'
import { isVariableValid, validateBoolean } from 'lib/utils'
import { useRouter } from 'next/navigation'
import { CartGrid } from 'components/native/Cart'

export default function User({}) {
    const { Authenticated, AccessToken } = useValidAccessToken()
    const [items, setItems] = useState(null)
    const router = useRouter()

    useEffect(() => {
        if (validateBoolean(Authenticated, false)) router.push('/')
    }, [Authenticated, router])

    useEffect(() => {
        async function getWishlist() {
            try {
                const answer = await fetch(`/api/wishlist`, {
                    headers: {
                        Authorization: `Bearer ${AccessToken}`,
                    },
                })

                const json = await answer.json()

                setItems(json?.wishlist?.items)
            } catch (error) {
                console.error({ error })
            }
        }

        if (isVariableValid(AccessToken)) getWishlist()
    }, [AccessToken])

    return (
        <>
            <Meta
                title="Pasargad"
                description="Home Page"
                image={Config.ogImage}
            />
            <CartGrid />
        </>
    )
}
