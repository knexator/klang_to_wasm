(module
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
        (i32.const 128)
        (return))
      ;; Target for (br 2), c == 0, red
      (i32.const 255)
      (return))
    ;; Target for (br 3)
    unreachable)

  (func (export "getPixelOld") (param f32 f32 i32) (result i32)
    (local i32)
    i32.const 128
    local.set 3
    block  ;; label = @1
      block  ;; label = @2
        block  ;; label = @3
          local.get 2
          br_table 0 (;@3;) 2 (;@1;) 1 (;@2;) 1 (;@2;)
        end
        block  ;; label = @3
          local.get 0
          f32.const 0x1.fep+7 (;=255;)
          f32.mul
          local.tee 0
          f32.abs
          f32.const 0x1p+31 (;=2.14748e+09;)
          f32.lt
          i32.eqz
          br_if 0 (;@3;)
          local.get 0
          i32.trunc_f32_s
          return
        end
        i32.const -2147483648
        return
      end
      i32.const 0
      local.set 3
    end
    local.get 3)
  (memory (;0;) 17)
  (global (;0;) (mut i32) (i32.const 1048576))
  (export "memory" (memory 0))
  (data (;0;) (i32.const 1048576) "\ff\00\00\00\80\00\00\00{\00\00\00"))
