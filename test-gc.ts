import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testGC() {
    console.log('--- Starting GC Test ---')
    
    // 1. Create a fake channel
    const channel = await prisma.channel.create({
        data: { name: 'gc-test-channel-' + Date.now() }
    })
    console.log('Created channel:', channel.name)

    // 2. Create Update A with Asset 1 and Asset 2
    const updateA = await prisma.update.create({
        data: {
            platform: 'android',
            runtimeVersion: '1.0.0',
            channelId: channel.id,
            assets: {
                create: [
                    { hash: 'hash-shared', key: 'shared-key', fileExt: 'png' },
                    { hash: 'hash-unique-A', key: 'unique-A', fileExt: 'bundle' }
                ]
            }
        },
        include: { assets: true }
    })
    console.log('Created Update A:', updateA.id)

    // 3. Create Update B with Asset 1 (shared) and Asset 3
    const updateB = await prisma.update.create({
        data: {
            platform: 'android',
            runtimeVersion: '1.0.0',
            channelId: channel.id,
            assets: {
                create: [
                    { hash: 'hash-shared', key: 'shared-key', fileExt: 'png' },
                    { hash: 'hash-unique-B', key: 'unique-B', fileExt: 'bundle' }
                ]
            }
        },
        include: { assets: true }
    })
    console.log('Created Update B:', updateB.id)

    console.log('\n--- Running Deletion on Update A ---')
    // Simulate the DELETE route logic
    for (const asset of updateA.assets) {
        const refs = await prisma.asset.count({ where: { hash: asset.hash } })
        console.log(`Asset ${asset.hash} is referenced by ${refs} updates.`)
        if (refs > 1) {
            console.log(`  -> SKIP physical deletion for ${asset.hash}`)
        } else {
            console.log(`  -> WOULD physically delete ${asset.hash} from R2/Disk`)
        }
    }

    console.log('\nExecuting DB deletion for Update A...')
    await prisma.$transaction([
        prisma.asset.deleteMany({ where: { updateId: updateA.id } }),
        prisma.update.delete({ where: { id: updateA.id } })
    ])
    console.log('Update A deleted.')

    console.log('\n--- Checking Remaining DB State ---')
    const remainingAssets = await prisma.asset.findMany({ where: { channel: { id: channel.id } } } as any).catch(e => prisma.asset.findMany({ where: { update: { channelId: channel.id } } }))
    
    for (const asset of remainingAssets) {
        console.log(`Remaining asset: ${asset.hash}`)
    }

    if (remainingAssets.length === 2 && remainingAssets.some(a => a.hash === 'hash-shared') && remainingAssets.some(a => a.hash === 'hash-unique-B')) {
        console.log('\n✅ TEST PASSED: Shared asset was kept, unique asset B was kept. Unique asset A was removed from DB.')
    } else {
        console.log('\n❌ TEST FAILED: DB state is incorrect.')
    }

    // Cleanup
    await prisma.asset.deleteMany({ where: { update: { channelId: channel.id } } })
    await prisma.update.deleteMany({ where: { channelId: channel.id } })
    await prisma.channel.delete({ where: { id: channel.id } })
}

testGC().catch(console.error).finally(() => prisma.$disconnect())
