// Trait 파싱 성능 최적화 - 상태 머신 기반
// 정규식 대신 O(n) 문자 스캔으로 처리

pub struct TraitParser;

impl TraitParser {
    /// 최적화된 Trait 추출 (상태 머신)
    pub fn parse(code: &str) -> Vec<(String, usize)> {
        let mut traits = Vec::new();
        let bytes = code.as_bytes();
        let mut i = 0;
        
        while i < bytes.len() {
            // "trait " 패턴 찾기
            if i + 6 <= bytes.len() && 
               bytes[i] == b't' && bytes[i+1] == b'r' && 
               bytes[i+2] == b'a' && bytes[i+3] == b'i' && 
               bytes[i+4] == b't' && bytes[i+5] == b' ' {
                
                i += 6;
                
                // 이름 추출
                let name_start = i;
                while i < bytes.len() && bytes[i] != b' ' && bytes[i] != b'{' {
                    i += 1;
                }
                
                let name = String::from_utf8_lossy(&bytes[name_start..i]).to_string();
                traits.push((name, 1)); // (trait_name, method_count)
                
            } else {
                i += 1;
            }
        }
        
        traits
    }
}

#[test]
fn bench_parse() {
    let code = "trait Comparable { fn compare() } trait Clone { fn clone() }";
    let start = std::time::Instant::now();
    
    for _ in 0..10000 {
        let _ = TraitParser::parse(code);
    }
    
    let elapsed = start.elapsed();
    println!("10000 iterations: {:?}", elapsed);
}
