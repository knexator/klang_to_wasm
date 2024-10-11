(module
  (func $hola (import "env" "consoleLog") (param i32))
  (func (export "getPixel") (param $x f32) (param $y f32) (param $c i32) (result i32)
    (block
      (block
        (block
          (block (local.get $c)      
                (br_table
                            2   ;; c == 0 => (br 2) 
                            1   ;; c == 1 => (br 1) 
                            0   ;; c == 2 => (br 0) 
                            3)) ;; else => (br 3)
          ;; Target for (br 0)
          (i32.const 0)
          (return))
        ;; Target for (br 1)
        (call $hola (i32.const 128))
        (i32.const 128)
        (return))
      ;; Target for (br 2), c == 0, red
      (i32.const 255)
      (return))
    ;; Target for (br 3)
    unreachable)

  (memory (;0;) 17)
  (global (;0;) (mut i32) (i32.const 1048576))
  (export "memory" (memory 0))
  (data (;0;) (i32.const 1048576) "\ff\00\00\00\80\00\00\00{\00\00\00"))
