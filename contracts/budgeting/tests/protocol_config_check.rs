#[tokio::test]
async fn print_max_gas_burnt() -> anyhow::Result<()> {
    let worker = near_workspaces::sandbox().await?;
    let block = worker.view_block().await?;
    let block_reference = near_primitives::types::BlockReference::BlockId(
        near_primitives::types::BlockId::Hash(near_primitives::hash::CryptoHash(block.hash().0)),
    );
    let config = worker.protocol_config(block_reference).await?;
    println!(
        "max_gas_burnt={}",
        config.runtime_config.wasm_config.limit_config.max_gas_burnt
    );
    println!(
        "max_total_prepaid_gas={}",
        config
            .runtime_config
            .wasm_config
            .limit_config
            .max_total_prepaid_gas
    );
    println!("gas_limit={}", config.gas_limit);
    Ok(())
}
